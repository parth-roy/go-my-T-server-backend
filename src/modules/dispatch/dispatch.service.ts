import { prisma } from '@shared/db/prisma';
import { BookingStatus, DriverStatus, NotificationType, WorkerStatus, WorkerJobStatus, LaborType } from '@prisma/client';
import { logger } from '@shared/logger';
import { notificationService } from '@modules/notifications/notification.service';
import { createNotification } from '@modules/notifications/inapp.notification.service';
import { cancelBookingBySystem } from '@modules/booking/booking.service';
import { emitToWorkerRoom, emitToDriverRoom } from '@shared/socket/socket.instance';
import { DynamicModalService } from './sdui.service';
import { getRedis } from '@config/redis';
import { CorrelationContext } from '@shared/context/correlation.context';

const MAX_DRIVERS_TO_NOTIFY = 5;
const MAX_SEARCH_RADIUS_KM = 50;
const MAX_DECLINE_ROUNDS = 10;
const REDISPATCH_DELAY_MS = 5000;

// Haversine formula — straight-line km between two lat/lng points
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface EnqueueDispatchOptions {
    delayMs?: number;
    round?: number;
    reason?: string;
    jobId?: string;
    operationId?: string;
}

/**
 * ARCH-002: Durable Dispatch Enqueuer
 *
 * Enqueues a dispatch job to the durable BullMQ queue with a deterministic job ID
 * and optional delay (replacing process-local setTimeout).
 * Ensures dispatch operations survive server crashes, restarts, and autoscaling.
 * Safely falls back to asynchronous in-process execution if Redis/Queue is offline.
 */
export async function enqueueDispatch(
    bookingId: string,
    options: EnqueueDispatchOptions = {}
): Promise<{ success: boolean; jobId: string; mode: 'bullmq' | 'fallback' }> {
    const round = options.round ?? 0;
    const deterministicJobId = options.jobId || (
        round === 0
            ? `dispatch-init-${bookingId}`
            : `dispatch-retry-${bookingId}-${round}`
    );
    const operationId = options.operationId || CorrelationContext.getOperationId() || `op_dispatch_${bookingId}`;

    try {
        const redisClient = getRedis();
        const isRedisReady = redisClient && redisClient.status === 'ready';

        if (isRedisReady) {
            const { dispatchQueue } = await import('@shared/queue');
            await Promise.race([
                dispatchQueue.add(
                    'dispatch-booking',
                    { bookingId, reason: options.reason, round, operationId },
                    {
                        jobId: deterministicJobId,
                        delay: options.delayMs || 0,
                        removeOnComplete: true,
                        removeOnFail: { count: 50 },
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 2000 },
                    }
                ),
                new Promise((_, reject) => setTimeout(() => reject(new Error('BullMQ dispatchQueue.add timed out after 3000ms')), 3000)),
            ]);
            logger.info(`[DispatchQueue] Enqueued durable dispatch job ${deterministicJobId} (delay: ${options.delayMs || 0}ms, reason: ${options.reason || 'DISPATCH'}, op: ${operationId})`);
            return { success: true, jobId: deterministicJobId, mode: 'bullmq' };
        }
    } catch (err: any) {
        logger.warn(`[DispatchQueue] Redis enqueue failed for ${deterministicJobId}: ${err.message}. Operating in fallback mode.`);
    }

    // Graceful in-process fallback if Redis is offline
    if (options.delayMs && options.delayMs > 0) {
        const timer = setTimeout(() => {
            CorrelationContext.run({ operationId, bookingId }, () => {
                dispatchBooking(bookingId).catch(err =>
                    logger.error(`[DispatchFallback] Delayed dispatch error for ${bookingId}:`, err)
                );
            });
        }, options.delayMs);
        if (timer.unref) timer.unref();
    } else {
        setImmediate(() => {
            CorrelationContext.run({ operationId, bookingId }, () => {
                dispatchBooking(bookingId).catch(err =>
                    logger.error(`[DispatchFallback] Immediate dispatch error for ${bookingId}:`, err)
                );
            });
        });
    }

    return { success: true, jobId: deterministicJobId, mode: 'fallback' };
}

// ─────────────────────────────────────────────
// MAIN DISPATCH
// Called when booking.confirmed event fires or when BullMQ dispatch worker processes job.
// Finds nearest available verified drivers and pushes FCM notifications.
// Assignment is NOT done here — driver must explicitly call PATCH /bookings/:id/accept.
// ─────────────────────────────────────────────
export async function dispatchBooking(bookingId: string): Promise<void> {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        select: {
            id: true,
            bookingNumber: true,
            vehicleType: true,
            pickupLat: true,
            pickupLng: true,
            status: true,
            driverId: true,
            dispatchedAt: true,
            declineCount: true,
            pickupAddress: true,
            totalFare: true,
            customerId: true,
            stops: { select: { address: true }, take: 1, orderBy: { sequence: 'asc' } },
        },
    });

    if (!booking) {
        logger.warn(`[Dispatch] Booking ${bookingId} not found`);
        return;
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
        logger.warn(`[Dispatch] Booking ${bookingId} is not in CONFIRMED state. Current: ${booking.status}`);
        return;
    }

    if (booking.driverId) {
        logger.info(`[Dispatch] Booking ${bookingId} already assigned to driver ${booking.driverId}. Skipping redundant dispatch.`);
        return;
    }

    // Ensure dispatchedAt is recorded
    if (!booking.dispatchedAt) {
        await prisma.booking.update({
            where: { id: bookingId },
            data: { dispatchedAt: new Date() },
        }).catch(err => logger.debug(`[Dispatch] Stamping dispatchedAt failed for ${bookingId}:`, err.message));
    }

    if (booking.declineCount !== null && booking.declineCount >= MAX_DECLINE_ROUNDS) {
        logger.warn(`[Dispatch] Booking ${bookingId} declined ${booking.declineCount} times. Auto-cancelling.`);
        await cancelBookingBySystem(bookingId, 'No drivers available after maximum attempts');
        return;
    }

    if ((booking.declineCount ?? 0) >= MAX_DECLINE_ROUNDS) {
        await notifyNoDriverFound(booking);
        return;
    }

    // Query available, verified drivers with matching vehicle type who have a GPS location
    const candidates = await prisma.driver.findMany({
        where: {
            status: DriverStatus.AVAILABLE,
            isDocVerified: true,
            isActive: true,
            vehicle: { type: booking.vehicleType, isActive: true },
            currentLat: { not: null },
            currentLng: { not: null },
        },
        select: {
            id: true,
            currentLat: true,
            currentLng: true,
            rating: true,
            user: { select: { id: true, fcmToken: true } },
        },
    });

    if (candidates.length === 0) {
        logger.warn(`[Dispatch] No available ${booking.vehicleType} drivers for booking ${booking.bookingNumber}`);
        await notifyNoDriverFound(booking);
        return;
    }

    // Rank by distance (nearest first); tiebreak by rating (higher preferred)
    const ranked = candidates
        .map(d => ({
            ...d,
            distanceKm: haversineKm(d.currentLat!, d.currentLng!, booking.pickupLat, booking.pickupLng),
        }))
        .filter(d => d.distanceKm <= MAX_SEARCH_RADIUS_KM)
        .sort((a, b) => {
            const diff = a.distanceKm - b.distanceKm;
            if (Math.abs(diff) > 2) return diff;   // >2 km apart → sort by distance
            return b.rating - a.rating;              // within 2 km → higher rating wins
        })
        .slice(0, MAX_DRIVERS_TO_NOTIFY);

    if (ranked.length === 0) {
        logger.warn(`[Dispatch] No drivers within ${MAX_SEARCH_RADIUS_KM} km for booking ${booking.bookingNumber}`);
        await notifyNoDriverFound(booking);
        return;
    }

    const dropAddress = booking.stops[0]?.address ?? 'Destination';
    const body = `₹${booking.totalFare ?? '—'} • ${booking.pickupAddress} → ${dropAddress}`;

    // Build Server-Driven UI Dynamic Modal for real-time overlay
    const sduiModal = DynamicModalService.buildDirectInstantAlertModal({
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        totalFare: booking.totalFare,
        pickupAddress: booking.pickupAddress,
        dropAddress,
        vehicleType: booking.vehicleType,
    });

    // Notify all ranked drivers simultaneously via Socket.IO and FCM
    await Promise.allSettled(
        ranked.map(async (driver) => {
            // 1. Emit live Socket event to driver's personal room (instant foreground presentation)
            emitToDriverRoom(driver.id, 'sdui_modal_received', sduiModal);

            // 2. High-priority FCM push (for background / screen-locked delivery)
            if (!driver.user.fcmToken) return;
            try {
                await notificationService.sendToDevice(driver.user.fcmToken, {
                    title: '⚡ Instant Direct Booking!',
                    body,
                    data: {
                        type: 'NEW_BOOKING',
                        bookingId: booking.id,
                        vehicleType: booking.vehicleType,
                        fare: String(booking.totalFare ?? 0),
                        distanceKm: String(Math.round(driver.distanceKm * 10) / 10),
                        sduiModal: JSON.stringify(sduiModal),
                    },
                });
                await createNotification(
                    driver.user.id,
                    '⚡ Instant Direct Booking!',
                    body,
                    NotificationType.BOOKING_STATUS,
                    booking.id,
                );
                logger.info(`[Dispatch] Notified driver ${driver.id} (${Math.round(driver.distanceKm * 10) / 10} km) for booking ${booking.bookingNumber} with SDUI modal`);
            } catch (err) {
                logger.error(`[Dispatch] FCM failed for driver ${driver.id}:`, err);
            }
        })
    );

    // Also notify fleet owners who have available trucks of this vehicle type
    await notifyFleetOwners(booking, body);

    logger.info(`[Dispatch] Booking ${booking.bookingNumber} dispatched to ${ranked.length} drivers`);
    } catch (err: any) {
        logger.error(`[Dispatch] Unexpected error dispatching booking ${bookingId}:`, err);
    }
}

// FIX HIGH-22: Notify fleet owners when a booking needs a driver
async function notifyFleetOwners(
    booking: { id: string; vehicleType: string; pickupAddress: string; totalFare: number | null },
    body: string,
): Promise<void> {
    try {
        const fleetOwners = await prisma.fleetOwner.findMany({
            where: {
                isActive: true,
                trucks: {
                    some: {
                        type: booking.vehicleType as any,
                        isActive: true,
                    },
                },
                user: { fcmToken: { not: null } },
            },
            select: { user: { select: { id: true, fcmToken: true } } },
            take: 10,
        });

        await Promise.allSettled(
            fleetOwners.map(async (fo) => {
                if (!fo.user.fcmToken) return;
                try {
                    await notificationService.sendToDevice(fo.user.fcmToken, {
                        title: '📦 New Booking Available',
                        body,
                        data: { type: 'NEW_BOOKING_FLEET', bookingId: booking.id },
                    });
                    await createNotification(
                        fo.user.id,
                        '📦 New Booking Available',
                        body,
                        NotificationType.BOOKING_STATUS,
                        booking.id,
                    );
                } catch (err) {
                    logger.error('[Dispatch] Fleet owner FCM failed:', err);
                }
            })
        );
    } catch (err) {
        logger.error('[Dispatch] Fleet owner notification failed:', err);
    }
}

async function notifyNoDriverFound(booking: { customerId: string; id: string; bookingNumber: string; declineCount: number | null }): Promise<void> {
    try {
        const currentRounds = booking.declineCount ?? 0;
        
        if (currentRounds >= MAX_DECLINE_ROUNDS) {
            logger.warn(`[Dispatch] Booking ${booking.bookingNumber} reached max search rounds (${currentRounds}). Auto-cancelling.`);
            await cancelBookingBySystem(booking.id, 'No drivers available after maximum attempts');
            return;
        }

        // Increment rounds and retry after a delay
        await prisma.booking.update({
            where: { id: booking.id },
            data: { declineCount: { increment: 1 } }
        });

        const customer = await prisma.user.findUnique({
            where: { id: booking.customerId },
            select: { fcmToken: true },
        });
        if (customer?.fcmToken) {
            await notificationService.sendToDevice(customer.fcmToken, {
                title: 'Searching for Driver',
                body: 'We are still searching for a driver for your booking. We will notify you as soon as one is found.',
                data: { type: 'NO_DRIVER_FOUND', bookingId: booking.id },
            });
        }
        await createNotification(
            booking.customerId,
            'Searching for Driver',
            'We are still searching for a driver for your booking.',
            NotificationType.BOOKING_STATUS,
            booking.id,
        );

        // Schedule durable retry via BullMQ
        await enqueueDispatch(booking.id, {
            delayMs: 30000,
            round: (booking.declineCount ?? 0) + 1,
            reason: 'NO_DRIVER_FOUND_RETRY',
        });

    } catch (err) {
        logger.error('[Dispatch] notifyNoDriverFound failed:', err);
    }
    logger.warn(`[Dispatch] No driver found for booking ${booking.bookingNumber} after ${booking.declineCount ?? 0} decline(s)`);
}

// ─────────────────────────────────────────────
// HANDLE DRIVER DECLINE — called from booking.service.ts
// Increments declineCount and re-dispatches after a short delay
// ─────────────────────────────────────────────
export async function handleDriverDecline(bookingId: string): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, declineCount: true, status: true },
    });

    if (!booking || booking.status !== BookingStatus.CONFIRMED) return;

    logger.info(`[Dispatch] Booking ${bookingId} declined ${(booking.declineCount ?? 0)} time(s) — scheduling durable re-dispatch`);

    await enqueueDispatch(bookingId, {
        delayMs: REDISPATCH_DELAY_MS,
        round: (booking.declineCount ?? 0) + 1,
        reason: 'DRIVER_DECLINED_RETRY',
    });
}

// ─────────────────────────────────────────────
// DISPATCH WORKERS — called from EventBus on booking.confirmed
// Finds nearest available, verified workers and creates JobAssignment records.
// Does NOT touch existing dispatchBooking() at all.
// ─────────────────────────────────────────────

const MAX_WORKERS_TO_NOTIFY = 10;
const WORKER_SEARCH_RADIUS_KM = 30;
const WORKER_PAYOUT_PER_JOB = 150; // ₹150 per worker per job — can be made configurable via DB later

export async function dispatchWorkers(bookingId: string): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            id: true, bookingNumber: true, laborRequired: true, laborersCount: true,
            laborType: true, laborCharge: true, pickupLat: true, pickupLng: true,
            pickupAddress: true,
            stops: { select: { address: true }, take: 1, orderBy: { sequence: 'asc' } },
        },
    });

    if (!booking) {
        logger.warn(`[WorkerDispatch] Booking ${bookingId} not found`);
        return;
    }
    if (!booking.laborRequired) {
        logger.debug(`[WorkerDispatch] Booking ${bookingId} does not require labor — skipping`);
        return;
    }

    const slotsNeeded = booking.laborersCount ?? 1;

    // Build laborType filter: if booking wants LOADING, notify LOADING or BOTH workers
    let laborTypeFilter: any = {};
    if (booking.laborType && booking.laborType !== LaborType.BOTH) {
        laborTypeFilter = {
            OR: [
                { preferredTypes: { has: booking.laborType } },
                { preferredTypes: { has: LaborType.BOTH } },
                { preferredTypes: { isEmpty: true } }, // Worker with no preference accepts any
            ],
        };
    }

    // Query available, verified workers with GPS coordinates
    const candidates = await prisma.worker.findMany({
        where: {
            status: WorkerStatus.AVAILABLE,
            isDocVerified: true,
            isActive: true,
            currentLat: { not: null },
            currentLng: { not: null },
            ...laborTypeFilter,
            // Exclude workers already notified for this booking
            jobAssignments: {
                none: { bookingId },
            },
        },
        select: {
            id: true,
            currentLat: true,
            currentLng: true,
            rating: true,
            user: { select: { id: true, fcmToken: true } },
        },
    });

    if (candidates.length === 0) {
        logger.warn(`[WorkerDispatch] No available workers for booking ${booking.bookingNumber}`);
        return;
    }

    // Rank by distance (nearest first), tiebreak by rating
    const ranked = candidates
        .map(w => ({
            ...w,
            distanceKm: haversineKm(w.currentLat!, w.currentLng!, booking.pickupLat, booking.pickupLng),
        }))
        .filter(w => w.distanceKm <= WORKER_SEARCH_RADIUS_KM)
        .sort((a, b) => {
            const diff = a.distanceKm - b.distanceKm;
            if (Math.abs(diff) > 2) return diff;
            return b.rating - a.rating;
        })
        .slice(0, MAX_WORKERS_TO_NOTIFY);

    if (ranked.length === 0) {
        logger.warn(`[WorkerDispatch] No workers within ${WORKER_SEARCH_RADIUS_KM}km for booking ${booking.bookingNumber}`);
        return;
    }

    const payoutPerWorker = booking.laborCharge
        ? Math.round(booking.laborCharge / slotsNeeded)
        : WORKER_PAYOUT_PER_JOB;

    const dropAddress = booking.stops[0]?.address ?? 'Destination';
    const notifBody = `₹${payoutPerWorker} • ${booking.pickupAddress} → ${dropAddress}`;

    // Create JobAssignment for each candidate + notify simultaneously
    await Promise.allSettled(
        ranked.map(async (worker) => {
            try {
                // Upsert to avoid duplicate assignment on re-dispatch
                const assignment = await prisma.jobAssignment.upsert({
                    where: { bookingId_workerId: { bookingId, workerId: worker.id } },
                    create: {
                        bookingId,
                        workerId: worker.id,
                        status: WorkerJobStatus.PENDING_ACCEPTANCE,
                        payoutAmount: payoutPerWorker,
                    },
                    update: {
                        // On re-dispatch (if DECLINED previously), reset to PENDING
                        status: WorkerJobStatus.PENDING_ACCEPTANCE,
                        payoutAmount: payoutPerWorker,
                        declinedAt: null,
                        declineReason: null,
                    },
                });

                // Skip if already accepted/in-progress
                if (!['PENDING_ACCEPTANCE'].includes(assignment.status)) {
                    return;
                }

                // FCM push
                if (worker.user.fcmToken) {
                    await notificationService.sendToDevice(worker.user.fcmToken, {
                        title: '🏗️ New Job Nearby!',
                        body: notifBody,
                        data: {
                            type: 'NEW_WORKER_JOB',
                            assignmentId: assignment.id,
                            bookingId,
                            payout: String(payoutPerWorker),
                            distanceKm: String(Math.round(worker.distanceKm * 10) / 10),
                        },
                    });
                }

                // Socket push to worker's personal room
                emitToWorkerRoom(worker.id, 'new_job_alert', {
                    assignmentId: assignment.id,
                    bookingId,
                    bookingNumber: booking.bookingNumber,
                    payoutAmount: payoutPerWorker,
                    laborType: booking.laborType,
                    pickupAddress: booking.pickupAddress,
                    dropAddress,
                    distanceKm: Math.round(worker.distanceKm * 10) / 10,
                    slotsTotal: slotsNeeded,
                });

                await createNotification(
                    worker.user.id,
                    '🏗️ New Job Nearby!',
                    notifBody,
                    NotificationType.BOOKING_STATUS,
                    bookingId,
                );

                logger.info(`[WorkerDispatch] Notified worker ${worker.id} (${Math.round(worker.distanceKm * 10) / 10}km) for booking ${booking.bookingNumber}`);
            } catch (err) {
                logger.error(`[WorkerDispatch] Failed to notify worker ${worker.id}:`, err);
            }
        }),
    );

    logger.info(`[WorkerDispatch] Booking ${booking.bookingNumber} dispatched to ${ranked.length} workers (${slotsNeeded} slots needed)`);
}

