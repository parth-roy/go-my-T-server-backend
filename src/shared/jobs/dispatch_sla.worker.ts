/**
 * dispatch_sla.worker.ts — 5-Minute Dispatch SLA Monitor & Ops Escalation Worker
 *
 * Runs periodically to monitor open, unassigned direct bookings. If a customer's
 * booking is not accepted by a driver within the 5-minute SLA window:
 *  1. Sets booking.isOpsEscalated = true.
 *  2. Generates an AdminDispatchAlert record in the database.
 *  3. Emits real-time alerting events to the Customer and Admin Operations rooms.
 *  4. Pushes reassuring Server-Driven UI (SDUI) modals to the customer app.
 */

import { prisma } from '@shared/db/prisma';
import { logger } from '@shared/logger';
import { BookingStatus, DispatchAlertSeverity, NotificationType } from '@prisma/client';
import { emitToBookingRoom, emitToCustomerRoom, emitToAdminOpsRoom } from '@shared/socket/socket.instance';
import { DynamicModalService } from '@modules/dispatch/sdui.service';
import { notificationService } from '@modules/notifications/notification.service';
import { createNotification } from '@modules/notifications/inapp.notification.service';

const SLA_CHECK_INTERVAL_MS = 30 * 1000; // Run every 30 seconds

export async function checkExpiredDispatchBookings(): Promise<void> {
    try {
        const now = new Date();
        const timedOutBookings = await prisma.booking.findMany({
            where: {
                driverId: null,
                status: {
                    in: [BookingStatus.CONFIRMED, BookingStatus.DRAFT],
                },
                isOpsEscalated: false,
                dispatchedAt: { not: null },
                dispatchTimeoutAt: { lte: now },
            },
            include: {
                customer: { select: { id: true, name: true, phone: true, fcmToken: true } },
            },
            take: 25,
        });

        if (timedOutBookings.length === 0) return;

        logger.info(`[DispatchSLA] Found ${timedOutBookings.length} bookings exceeding 5-min dispatch SLA. Escalating...`);

        for (const booking of timedOutBookings) {
            try {
                // 1. Mark booking as escalated
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: { isOpsEscalated: true },
                });

                // 2. Create Admin Dispatch Alert
                const alert = await prisma.adminDispatchAlert.create({
                    data: {
                        bookingId: booking.id,
                        severity: DispatchAlertSeverity.CRITICAL_TIMEOUT,
                        reason: `Matching SLA exceeded (>5 minutes unassigned for ${booking.vehicleType})`,
                    },
                });

                // 3. Emit real-time Socket alert to Admin Operations room
                emitToAdminOpsRoom('admin_dispatch_alert', {
                    alertId: alert.id,
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    vehicleType: booking.vehicleType,
                    pickupAddress: booking.pickupAddress,
                    totalFare: booking.totalFare,
                    customerName: booking.customer.name,
                    customerPhone: booking.customer.phone,
                    severity: alert.severity,
                    createdAt: alert.createdAt,
                });

                // 4. Generate Server-Driven UI Reassuring Modal for Customer
                const sduiModal = DynamicModalService.buildSearchSlaWarningModal({
                    id: booking.id,
                    bookingNumber: booking.bookingNumber,
                    pickupAddress: booking.pickupAddress,
                });

                // 5. Emit live event to customer room
                emitToCustomerRoom(booking.customerId, 'dispatch_timeout_escalated', {
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                });
                emitToBookingRoom(booking.id, 'dispatch_timeout_escalated', {
                    bookingId: booking.id,
                });
                emitToCustomerRoom(booking.customerId, 'sdui_modal_received', sduiModal);

                // 6. Push reassuring push notification
                if (booking.customer.fcmToken) {
                    await notificationService.sendToDevice(booking.customer.fcmToken, {
                        title: '⏳ High Demand on Your Route',
                        body: 'Our 24/7 dedicated fleet desk is arranging a verified truck for your load.',
                        data: {
                            type: 'DISPATCH_TIMEOUT_ESCALATED',
                            bookingId: booking.id,
                            sduiModal: JSON.stringify(sduiModal),
                        },
                    }).catch(err => logger.error('[DispatchSLA] FCM push failed:', err));
                }

                await createNotification(
                    booking.customerId,
                    '⏳ Priority Fleet Allocation Active',
                    'Your shipment has been routed to our operations desk for personal fulfillment.',
                    NotificationType.BOOKING_STATUS,
                    booking.id,
                ).catch(err => logger.error('[DispatchSLA] In-app notification failed:', err));

                logger.info(`[DispatchSLA] Escalated booking ${booking.bookingNumber} to Admin Ops`);
            } catch (singleErr) {
                logger.error(`[DispatchSLA] Error escalating booking ${booking.id}:`, singleErr);
            }
        }
    } catch (err) {
        logger.error('[DispatchSLA] Worker check failed:', err);
    }
}

export function startDispatchSlaWorker(): void {
    const run = () => {
        checkExpiredDispatchBookings().catch(err => logger.error('[DispatchSLA] Run failed:', err));
    };

    run();
    setInterval(run, SLA_CHECK_INTERVAL_MS);
    logger.info('✅ Dispatch 5-minute SLA worker started (30s interval)');
}
