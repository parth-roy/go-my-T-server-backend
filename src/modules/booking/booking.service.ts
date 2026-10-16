import { prisma } from '@shared/db/prisma';
import { generateScratchCard } from '@modules/rewards/rewards.service';
import { createNotification } from '@modules/notifications/inapp.notification.service';
import { appendToGMTSheet } from '@shared/services/googleSheets.service';
import { NotificationType } from '@prisma/client';
import {
    BidAwardStatus,
    BidWindowStatus,
    BookingChannel,
    BookingMode,
    BookingStatus,
    DriverStatus,
    MarketplaceBidStatus,
    PaymentMethod,
    PaymentStatus,
    Prisma,
    UserRole,
    WorkerJobStatus,
    WorkerStatus,
} from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import { AppError } from '@shared/errors/AppError';
import { eventBus } from '@shared/eventbus';
import { logger } from '@shared/logger';
import { getRedis } from '@config/redis';
import { notificationService } from '@modules/notifications/notification.service';
import { pricingService } from '@modules/pricing/pricing.service';
import type { FareEstimateResponse } from '@modules/pricing/pricing.types';
import { handleDriverDecline, enqueueDispatch } from '@modules/dispatch/dispatch.service';
import { checkServiceability } from '@modules/maps/serviceability.service';
import { settleTripEarnings } from '@modules/driver-wallet/driver-wallet.service';
import { refundToWallet } from '@modules/wallet/wallet.service';
import { s3Service } from '@modules/upload/upload.service';
import type {
    CreateBookingInput,
    CancelBookingInput,
    RateBookingInput,
    ListBookingsQuery,
} from './booking.schema';
import { env } from '@config/env';
import * as MarketplaceService from '@modules/marketplace/marketplace.service';
import { assertTransition, canTransition, getAllowedTransitions, logTransition } from './booking.transition';
export { assertTransition, canTransition, getAllowedTransitions, logTransition };
import { extractCityFromAddress, getCityAliases } from '@modules/broker/broker.service';
import { ConcurrencyLockService } from '@modules/dispatch/concurrency_lock.service';
import { DynamicModalService } from '@modules/dispatch/sdui.service';
import { emitToBookingRoom, emitToCustomerRoom } from '@shared/socket/socket.instance';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateBookingNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const random = randomInt(100000, 999999);
    return `BK${dateStr}${random}`;
}

// Reusable select shape â€” used for every response that returns a full booking
const bookingDetailSelect = {
    id: true,
    bookingNumber: true,
    customerId: true,
    driverId: true,
    status: true,
    bookingMode: true,
    bidWindowMinutes: true,
    marketplaceVersion: true,
    awardedFleetOwnerId: true,
    bidWindow: true,
    vehicleType: true,
    declineCount: true,
    hasLoadingService: true,
    goodsType: true,
    goodsDescription: true,
    goodsWeightKg: true,
    goodsQuantity: true,
    goodsLengthCm: true,
    goodsWidthCm: true,
    goodsHeightCm: true,
    declaredGoodsValue: true,
    handlingInstructions: true,
    containsRestrictedGoods: true,
    goodsImageUrls: true,
    laborRequired: true,
    laborersCount: true,
    laborType: true,
    laborCharge: true,
    pickupLat: true,
    pickupLng: true,
    pickupAddress: true,
    stops: {
        orderBy: { sequence: 'asc' as const },
    },
    receiverName: true,
    receiverPhone: true,
    gstin: true,
    gstBusinessName: true,
    estimatedDistance: true,
    estimatedDuration: true,
    arrivalTime: true,
    baseFare: true,
    distanceFare: true,
    timeFare: true,
    fuelSurcharge: true,
    loadingCharge: true,
    surgeMultiplier: true,
    coinsRedeemed: true,
    discountAmount: true,
    taxAmount: true,
    gstAmount: true,
    waitingCharge: true,
    tollCharge: true,
    totalFare: true,
    grandTotal: true,
    paymentStatus: true,
    paymentMethod: true,
    customerRating: true,
    driverRating: true,
    customerNote: true,
    cancellationReason: true,
    cancelledBy: true,
    cancellationTime: true,
    actualPickupTime: true,
    actualDeliveryTime: true,
    insuranceOpted: true,
    insuranceProvider: true,
    insuranceAmount: true,
    bookingPersona: true,
    truckCount: true,
    contractDuration: true,
    urgencyWindow: true,
    slaExpiresAt: true,
    createdAt: true,
    updatedAt: true,
    driver: {
        select: {
            id: true,
            rating: true,
            user: {
                select: {
                    name: true,
                    phone: true,
                    profileImageUrl: true,
                },
            },
            vehicle: {
                select: {
                    type: true,
                    make: true,
                    model: true,
                    registrationNo: true,
                    color: true,
                },
            },
        },
    },
    customer: {
        select: {
            name: true,
            phone: true,
            profileImageUrl: true,
        },
    },
    pickupOtp: true,
    bookingChannel: true,
    hasCounterBids: true,
    dispatchedAt: true,
    dispatchTimeoutAt: true,
    isOpsEscalated: true,
    brokerFulfillment: {
        select: {
            assignedDriverName: true,
            assignedDriverPhone: true,
            assignedTruckRegNo: true,
            brokerProfile: {
                select: {
                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    },
} as const;

// Internal helper â€” verifies the calling driver owns the booking
async function getDriverBooking(bookingId: string, userId: string) {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw AppError.notFound('Driver profile not found');

    const booking = await prisma.booking.findFirst({
        where: { id: bookingId, driverId: driver.id },
    });
    if (!booking) {
        throw AppError.notFound('Booking not found or not assigned to you');
    }

    return { booking, driver };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CUSTOMER â€” CREATE BOOKING
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createBooking(customerId: string, data: CreateBookingInput) {
    const {
        stops,
        estimatedFare,
        estimatedDistanceKm,
        dropLat,
        dropLng,
        dropAddress,
        pickupTime,
        pickupDateTime,
        customerNote: rawCustomerNote,
        ...bookingData
    } = data as any;

    if (data.containsRestrictedGoods) {
        throw AppError.badRequest(
            'Restricted or hazardous goods cannot be booked through the standard flow. Contact support for compliance review.',
            'RESTRICTED_GOODS_NOT_SUPPORTED'
        );
    }

    // â”€â”€ SAME LOCATION CHECK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (stops.length > 0) {
        const dLat = Math.abs(stops[0].latitude - data.pickupLat);
        const dLng = Math.abs(stops[0].longitude - data.pickupLng);
        if (dLat < 0.0005 && dLng < 0.0005) { // ~50m threshold
            throw AppError.badRequest(
                'Pickup and delivery location cannot be the same',
                'SAME_LOCATION'
            );
        }
        for (let i = 0; i < stops.length - 1; i++) {
            const legLat = Math.abs(stops[i + 1].latitude - stops[i].latitude);
            const legLng = Math.abs(stops[i + 1].longitude - stops[i].longitude);
            if (legLat < 0.0005 && legLng < 0.0005) {
                throw AppError.badRequest(
                    `Stop ${i + 1} and Stop ${i + 2} cannot be the same location`,
                    'SAME_LOCATION'
                );
            }
        }
    }

    // â”€â”€ SERVICE AREA CHECK (Mapbox reverse geocode â†’ country = India) â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Primary: Mapbox reverse geocode. Fallback: bounding box (if Mapbox down).
    // Pickup AND all delivery stops must be in serviceable area.
    const serviceabilityChecks = await Promise.all([
        checkServiceability(data.pickupLat, data.pickupLng),
        ...stops.map((s: any) => checkServiceability(s.latitude, s.longitude)),
    ]);

    if (!serviceabilityChecks[0].allowed) {
        throw AppError.badRequest(
            serviceabilityChecks[0].reason ?? 'Pickup location is outside our service area',
            'OUT_OF_SERVICE_AREA'
        );
    }
    for (let i = 0; i < stops.length; i++) {
        const stopCheck = serviceabilityChecks[i + 1];
        if (!stopCheck.allowed) {
            throw AppError.badRequest(
                stopCheck.reason ?? `Stop ${i + 1} (${stops[i].address}) is outside our service area`,
                'OUT_OF_SERVICE_AREA'
            );
        }
    }

    // â”€â”€ FIX HIGH-8: Driver availability check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const availableDriverCount = await prisma.driver.count({
        where: {
            status: 'AVAILABLE',
            isDocVerified: true,
            isActive: true,
            vehicle: { type: data.vehicleType as any, isActive: true },
        },
    });
    // TEMPORARY BYPASS FOR TESTING UI
    // if (availableDriverCount === 0) {
    //     throw AppError.badRequest(
    //         'No drivers available for this vehicle type right now. Please try again later.',
    //         'NO_DRIVERS_AVAILABLE'
    //     );
    // }

    // â”€â”€ FIX CRITICAL-1: Server-side fare recalculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let serverFare: FareEstimateResponse;
    try {
        const lastStop = stops[stops.length - 1];
        serverFare = await pricingService.estimateFare({
            pickupLat: data.pickupLat,
            pickupLng: data.pickupLng,
            dropLat: lastStop.latitude,
            dropLng: lastStop.longitude,
            stops: stops.map((s: any) => ({
                latitude: s.latitude,
                longitude: s.longitude,
                address: s.address,
            })),
            vehicleType: data.vehicleType,
            hasLoadingService: data.laborRequired || data.hasLoadingService,
            helperCount: data.laborRequired ? data.laborersCount : undefined,
            insuranceOpted: data.insuranceOpted,
        });
    } catch (err) {
        logger.error('Server-side fare calculation failed:', err);
        throw AppError.internal('Unable to calculate fare. Please try again.');
    }

    // â”€â”€ Maximum distance validation removed for all-India service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    if (
        data.goodsWeightKg !== undefined &&
        Number(serverFare.vehicle.capacityKg) > 0 &&
        data.goodsWeightKg > Number(serverFare.vehicle.capacityKg)
    ) {
        throw AppError.badRequest(
            `Declared goods weight exceeds this vehicle's ${serverFare.vehicle.capacityKg} kg capacity.`,
            'VEHICLE_CAPACITY_EXCEEDED'
        );
    }

    // Validate client-supplied fare is within 10% of server-calculated fare
    if (estimatedFare !== undefined) {
        const deviation = Math.abs(estimatedFare - serverFare.totalFare) / serverFare.totalFare;
        if (deviation > 0.10) {
            throw AppError.badRequest(
                `Fare has changed. Server fare: â‚¹${serverFare.totalFare}. Please refresh and try again.`,
                'FARE_MISMATCH'
            );
        }
    }

    // â”€â”€ FIX MEDIUM-7: Booking number collision retry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let booking = null;
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            booking = await prisma.booking.create({
                data: {
                    ...bookingData,
                    customerNote: rawCustomerNote
                        ? (pickupTime && !rawCustomerNote.includes(pickupTime)
                            ? `${rawCustomerNote} (Pickup: ${pickupTime})`
                            : rawCustomerNote)
                        : (pickupTime ? `Pickup: ${pickupTime}` : null),
                    bookingPersona: (bookingData.bookingPersona as any) || "INDIVIDUAL",
                    truckCount: bookingData.truckCount || 1,
                    contractDuration: bookingData.contractDuration || null,
                    urgencyWindow: (bookingData.urgencyWindow as any) || "FLEXIBLE",
                    slaExpiresAt: bookingData.slaExpiresAt
                        ? new Date(bookingData.slaExpiresAt)
                        : pickupDateTime
                            ? new Date(pickupDateTime)
                            : bookingData.urgencyWindow === 'UNDER_2_HOURS'
                                ? new Date(Date.now() + 2 * 3600 * 1000)
                                : bookingData.urgencyWindow === 'UNDER_4_HOURS'
                                    ? new Date(Date.now() + 4 * 3600 * 1000)
                                    : bookingData.urgencyWindow === 'UNDER_24_HOURS'
                                        ? new Date(Date.now() + 24 * 3600 * 1000)
                                        : bookingData.urgencyWindow === 'TWO_DAYS'
                                            ? new Date(Date.now() + 48 * 3600 * 1000)
                                            : null,
                    hasLoadingService: data.laborRequired || data.hasLoadingService,
                    laborRequired: data.laborRequired,
                    laborersCount: data.laborRequired ? data.laborersCount : null,
                    laborType: data.laborRequired ? data.laborType : null,
                    laborCharge: data.laborRequired ? serverFare.fareBreakdown.loadingCharge : null,
                    customerId,
                    bookingNumber: generateBookingNumber(),
                    status: BookingStatus.DRAFT,
                    totalFare: serverFare.totalFare,
                    baseFare: serverFare.fareBreakdown.baseFare,
                    distanceFare: serverFare.fareBreakdown.distanceFare,
                    timeFare: serverFare.fareBreakdown?.timeFare ?? 0,
                    fuelSurcharge: serverFare.fareBreakdown?.fuelSurcharge ?? 0,
                    surgeMultiplier: serverFare.fareBreakdown?.surgeMultiplier ?? 1.0,
                    loadingCharge: serverFare.fareBreakdown.loadingCharge,
                    gstAmount: serverFare.gstBreakdown?.totalGst ?? 0,
                    taxAmount: serverFare.gstBreakdown?.totalGst ?? 0,
                    grandTotal: serverFare.grandTotal,
                    estimatedDistance: serverFare.estimatedDistanceKm,
                    estimatedDuration: serverFare.estimatedDurationMinutes,
                    stops: {
                        create: stops.map((stop: any, index: number) => ({
                            ...stop,
                            sequence: index + 1,
                        })),
                    },
                },
                select: bookingDetailSelect,
            });
            break;
        } catch (err: any) {
            lastError = err;
            if (err.code === 'P2002' && attempt < 3) {
                logger.warn(`Booking number collision on attempt ${attempt}, retrying...`);
                continue;
            }
            throw err;
        }
    }

    if (!booking) throw AppError.internal('Failed to generate unique booking number');

    if (serverFare.auditLogId) {
        try {
            await prisma.pricingAuditLog.update({
                where: { id: serverFare.auditLogId },
                data: { bookingId: booking.id }
            });
        } catch (e) {
            logger.error(`Failed to link PricingAuditLog to booking ${booking.id}: ${e}`);
        }
    }

    logger.info(`Booking created: ${booking.bookingNumber} by customer ${customerId} (fare: ₹${serverFare.totalFare})`);
    return booking;
}
// ——————————————————————————————————————————————
// CUSTOMER — LIST MY BOOKINGS
// ——————————————————————————————————————————————

export async function listBookings(userId: string, role: string, query: ListBookingsQuery) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {
        ...(status && {
            status: typeof status === 'string' && status.includes(',')
                ? { in: status.split(',') }
                : status
        }),
    };

    if (role === UserRole.CUSTOMER) {
        where.customerId = userId;
    } else if (role === UserRole.DRIVER) {
        const driver = await prisma.driver.findUnique({
            where: { userId },
            include: { vehicle: true },
        });
        if (!driver) throw AppError.notFound('Driver profile not found');

        const isQueryingAvailable = typeof status === 'string' &&
            (status.includes('AVAILABLE') || status.includes('BROADCAST') || (query as any).scope === 'available');

        if (isQueryingAvailable) {
            // Driver is querying unassigned direct bookings to accept or counter-bid
            where.driverId = null;
            where.status = { in: [BookingStatus.CONFIRMED, BookingStatus.DRAFT] };
            where.bookingChannel = { in: [BookingChannel.CUSTOMER_DIRECT, BookingChannel.BROKER_DEMAND, BookingChannel.CUSTOMER_AUCTION] };
            if ((query as any).vehicleType) {
                where.vehicleType = (query as any).vehicleType;
            }
        } else {
            // Driver is querying their own assigned trips (Upcoming / Active / History)
            where.driverId = driver.id;
        }
    }

    const [bookings, total] = await prisma.$transaction([
        prisma.booking.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: bookingDetailSelect,
        }),
        prisma.booking.count({ where }),
    ]);

    const auditLogs = await prisma.pricingAuditLog.findMany({
        where: { bookingId: { in: bookings.map(b => b.id) } },
        orderBy: { calculatedAt: 'desc' },
    });

    const enrichedBookings = bookings.map(b => {
        const log = auditLogs.find(a => a.bookingId === b.id);
        const stops = (b as any).stops || [];
        const dropAddress = stops.length > 0 ? stops[stops.length - 1].address : b.pickupAddress;
        return {
            ...b,
            pickupCity: extractCityFromAddress(b.pickupAddress),
            dropCity: extractCityFromAddress(dropAddress),
            customerName: b.customer?.name || b.receiverName || 'Verified Shipper',
            customerPhone: b.customer?.phone || b.receiverPhone || '',
            driverPayout: log?.driverPayout ?? null,
        };
    });

    return {
        bookings: enrichedBookings,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET ONE BOOKING
// Customers see their own. Drivers see assigned ones. Admin sees all.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getBooking(bookingId: string, userId: string, role: string) {
    let booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: bookingDetailSelect,
    });

    if (!booking) {
        const brokerLoad = await prisma.brokerLoad.findFirst({
            where: {
                OR: [{ id: bookingId }, { sourceBookingId: bookingId }],
            },
        });
        if (brokerLoad) {
            if (brokerLoad.sourceBookingId) {
                booking = await prisma.booking.findUnique({
                    where: { id: brokerLoad.sourceBookingId },
                    select: bookingDetailSelect,
                });
            }
            if (!booking) {
                const resolved = await MarketplaceService.resolveBookingForMarketplace(bookingId);
                if (resolved) {
                    booking = await prisma.booking.findUnique({
                        where: { id: resolved.id },
                        select: bookingDetailSelect,
                    });
                }
            }
        }
    }

    if (!booking) throw AppError.notFound('Booking not found');

    if (role === UserRole.CUSTOMER && booking.customerId !== userId) {
        throw AppError.forbidden('You do not have access to this booking');
    }

    if (role === UserRole.DRIVER) {
        const driver = await prisma.driver.findUnique({ where: { userId } });
        if (!driver) {
            throw AppError.forbidden('Driver profile not found');
        }
        const canReadOpenOpportunity =
            booking.driverId === null &&
            (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.DRAFT);
        if (booking.driverId !== driver.id && !canReadOpenOpportunity) {
            throw AppError.forbidden('You do not have access to this booking');
        }
    } else if (role === UserRole.FLEET_OWNER) {
        const fleetOwner = await prisma.fleetOwner.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!fleetOwner) throw AppError.forbidden('Fleet owner profile not found');
        const canReadOpenOpportunity =
            booking.driverId === null &&
            (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.DRAFT);
        if (booking.awardedFleetOwnerId !== fleetOwner.id && !canReadOpenOpportunity) {
            throw AppError.forbidden('You do not have access to this booking');
        }
    } else if (role !== UserRole.CUSTOMER && role !== UserRole.ADMIN) {
        throw AppError.forbidden('You do not have access to this booking');
    }

    const auditLog = await prisma.pricingAuditLog.findFirst({
        where: { bookingId: booking.id },
        orderBy: { calculatedAt: 'desc' },
    });

    const resolvedStops = booking.stops
        ? await Promise.all(
            booking.stops.map(async (stop: any) => {
                if (!stop.podPhotoUrl) return stop;
                const viewableUrl = await s3Service.resolveViewableUrl(stop.podPhotoUrl);
                return { ...stop, podPhotoUrl: viewableUrl || stop.podPhotoUrl };
            })
        )
        : booking.stops;

    const result: any = {
        ...booking,
        stops: resolvedStops,
        driverPayout: auditLog?.driverPayout ?? null,
    };
    // Ensure customer's secret pickupOtp is NEVER disclosed to drivers or fleet owners
    if (role !== UserRole.CUSTOMER && role !== UserRole.ADMIN) {
        result.pickupOtp = null;
    }
    return result;
}

// ─────────────────────────────────────────────
// CUSTOMER — CONFIRM BOOKING (DRAFT → CONFIRMED)
// ─────────────────────────────────────────────

export async function confirmBooking(bookingId: string, customerId: string) {
    let targetId = bookingId;
    let booking = await prisma.booking.findFirst({
        where: { id: bookingId, customerId },
    });
    if (!booking) {
        const bl = await prisma.brokerLoad.findFirst({
            where: { OR: [{ id: bookingId }, { sourceBookingId: bookingId }] },
        });
        if (bl?.sourceBookingId) {
            targetId = bl.sourceBookingId;
            booking = await prisma.booking.findFirst({
                where: { id: targetId, customerId },
            });
        }
    }

    if (!booking) throw AppError.notFound('Booking not found');
    assertTransition(booking.status, BookingStatus.CONFIRMED);

    const updated = await prisma.$transaction(async (tx) => {
        const isBidding = booking.bookingMode === 'PRIVATE_BID';
        const timeoutMinutes = isBidding ? (booking.bidWindowMinutes || 10) : 5;
        const now = new Date();

        const confirmed = await tx.booking.update({
            where: { id: targetId },
            data: {
                status: BookingStatus.CONFIRMED,
                dispatchedAt: now,
                dispatchTimeoutAt: new Date(now.getTime() + timeoutMinutes * 60_000),
                bookingChannel: isBidding ? BookingChannel.CUSTOMER_AUCTION : BookingChannel.CUSTOMER_DIRECT,
            },
            select: bookingDetailSelect,
        });

        if (isBidding) {
            const closesAt = new Date(now.getTime() + confirmed.bidWindowMinutes * 60_000);
            await tx.bidWindow.create({
                data: {
                    bookingId: targetId,
                    closesAt,
                    maxRevisionsPerBid: env.BID_MAX_REVISIONS,
                },
            });
            return tx.booking.findUniqueOrThrow({ where: { id: targetId }, select: bookingDetailSelect });
        }
        return confirmed;
    });

    // ARCH-002: Durably schedule dispatch in BullMQ queue (survives process crashes/restarts)
    if (updated.bookingMode !== 'PRIVATE_BID') {
        enqueueDispatch(updated.id, { reason: 'BOOKING_COMMITTED_CONFIRMED' }).catch(err =>
            logger.error(`[BookingService] Failed to durably enqueue dispatch for ${updated.id}:`, err)
        );
    }

    // Phase 7 (Dispatch Engine) will listen for this event and assign a driver
    eventBus.emit('booking.confirmed', {
        bookingId: updated.id,
        customerId,
        vehicleType: updated.vehicleType,
    });

    logTransition({
        bookingId: updated.id,
        fromStatus: booking.status,
        toStatus: BookingStatus.CONFIRMED,
        actor: { id: customerId, role: 'CUSTOMER' },
    });

    logger.info(`Booking confirmed: ${updated.bookingNumber} (${updated.bookingChannel})`);
    return updated;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CANCEL BOOKING
// Both customers and drivers can cancel â€” with different state rules
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function cancelBooking(
    bookingId: string,
    userId: string,
    role: string,
    data: CancelBookingInput
) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw AppError.notFound('Booking not found');

    let actorDriverId: string | null = null;
    if (role === UserRole.CUSTOMER && booking.customerId !== userId) {
        throw AppError.forbidden('You do not have access to this booking');
    }
    if (role === UserRole.DRIVER) {
        const driver = await prisma.driver.findUnique({ where: { userId }, select: { id: true } });
        if (!driver || booking.driverId !== driver.id) {
            throw AppError.forbidden('Only the assigned driver can cancel this booking');
        }
        actorDriverId = driver.id;
    } else if (role !== UserRole.CUSTOMER && role !== UserRole.ADMIN) {
        throw AppError.forbidden('You do not have access to cancel this booking');
    }

    let previousStatus: BookingStatus | null = null;
    const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.booking.findUnique({ where: { id: bookingId } });
        if (!current) throw AppError.notFound('Booking not found');
        previousStatus = current.status;
        if (role === UserRole.CUSTOMER && current.customerId !== userId) {
            throw AppError.forbidden('You do not have access to this booking');
        }
        if (role === UserRole.DRIVER && current.driverId !== actorDriverId) {
            throw AppError.forbidden('Only the assigned driver can cancel this booking');
        }
        assertTransition(current.status, BookingStatus.CANCELLED);

        if (current.bookingMode === BookingMode.PRIVATE_BID) {
            const unsettledAward = await tx.bidAward.findFirst({
                where: {
                    bookingId,
                    activeKey: bookingId,
                    status: {
                        in: [
                            BidAwardStatus.PAYMENT_PENDING,
                            BidAwardStatus.PAYMENT_RECONCILING,
                        ],
                    },
                },
                select: { id: true },
            });
            if (unsettledAward) {
                throw AppError.conflict(
                    'This selected bid is being paid or reconciled. Wait for settlement before cancelling.',
                    'BID_PAYMENT_IN_PROGRESS',
                );
            }
        }

        const cancelled = await tx.booking.updateMany({
            where: {
                id: bookingId,
                status: current.status,
                marketplaceVersion: current.marketplaceVersion,
            },
            data: {
                status: BookingStatus.CANCELLED,
                cancellationReason: data.reason,
                cancelledBy: userId,
                cancellationTime: new Date(),
                marketplaceVersion: { increment: 1 },
            },
        });
        if (cancelled.count !== 1) {
            throw AppError.conflict('Booking changed before cancellation', 'BOOKING_STATE_CONFLICT');
        }

        if (current.bookingMode === BookingMode.PRIVATE_BID) {
            await tx.bidWindow.updateMany({
                where: { bookingId, status: BidWindowStatus.OPEN },
                data: {
                    status: BidWindowStatus.WITHDRAWN,
                    closedAt: new Date(),
                    version: { increment: 1 },
                },
            });
            await tx.marketplaceBid.updateMany({
                where: { bookingId, status: MarketplaceBidStatus.OPEN },
                data: { status: MarketplaceBidStatus.EXPIRED, closedAt: new Date() },
            });
        }

        if (
            current.driverId &&
            (current.status === BookingStatus.DRIVER_ASSIGNED ||
                current.status === BookingStatus.DRIVER_ARRIVING)
        ) {
            await tx.driver.updateMany({
                where: { id: current.driverId, status: DriverStatus.ON_TRIP },
                data: { status: DriverStatus.AVAILABLE },
            });
        }

        const activeWorkerAssignments = await tx.jobAssignment.findMany({
            where: {
                bookingId,
                status: {
                    in: [
                        WorkerJobStatus.ACCEPTED,
                        WorkerJobStatus.ARRIVED,
                        WorkerJobStatus.IN_PROGRESS,
                    ],
                },
            },
            select: { workerId: true },
        });
        if (activeWorkerAssignments.length > 0) {
            await tx.jobAssignment.updateMany({
                where: {
                    bookingId,
                    status: {
                        in: [
                            WorkerJobStatus.ACCEPTED,
                            WorkerJobStatus.ARRIVED,
                            WorkerJobStatus.IN_PROGRESS,
                        ],
                    },
                },
                data: { status: WorkerJobStatus.CANCELLED },
            });
            await tx.worker.updateMany({
                where: {
                    id: { in: activeWorkerAssignments.map((assignment) => assignment.workerId) },
                    status: WorkerStatus.ON_JOB,
                },
                data: { status: WorkerStatus.AVAILABLE },
            });
        }

        return tx.booking.findUniqueOrThrow({
            where: { id: bookingId },
            select: bookingDetailSelect,
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    logTransition({
        bookingId: updated.id,
        fromStatus: previousStatus ?? BookingStatus.DRAFT,
        toStatus: BookingStatus.CANCELLED,
        actor: { id: userId, role },
        reason: data.reason,
    });

    // Phase 11 (Notifications) will listen to alert the other party
    eventBus.emit('booking.cancelled', {
        bookingId: updated.id,
        customerId: updated.customerId,
        reason: data.reason,
    });

    if (updated.bookingMode === BookingMode.PRIVATE_BID) {
        MarketplaceService.notifyMarketplaceBookingCancelled(updated.id).catch((err) => {
            logger.error(`[Marketplace] Cancellation notification failed for ${updated.id}:`, err);
        });
    }

    // â”€â”€ AUTO REFUND: if customer paid via wallet, refund instantly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Uses fire-and-forget to not block the cancellation response.
    const fullBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { paymentStatus: true, paymentMethod: true, grandTotal: true, totalFare: true, customerId: true },
    });
    if (
        fullBooking?.paymentStatus === 'PAID' &&
        fullBooking?.paymentMethod === PaymentMethod.WALLET
    ) {
        const refundAmount = fullBooking.grandTotal ?? fullBooking.totalFare ?? 0;
        if (refundAmount > 0) {
            refundToWallet(fullBooking.customerId, bookingId, refundAmount).catch((err) => {
                logger.error(`[Refund] Wallet refund failed for booking ${bookingId}:`, err);
            });
        }
    }

    logger.info(`Booking cancelled: ${updated.bookingNumber} by ${userId}`);
    return updated;
}

export async function cancelBookingBySystem(bookingId: string, reason: string, cancelledBy: string = 'SYSTEM') {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
    if (!booking) return;
    return cancelBooking(bookingId, cancelledBy, UserRole.ADMIN, { reason });
}

// ─────────────────────────────────────────────────────────────────
// CUSTOMER — RATE BOOKING
// Only allowed after COMPLETED status
// ─────────────────────────────────────────────────────────────────

export async function rateBooking(
    bookingId: string,
    customerId: string,
    data: RateBookingInput
) {
    const booking = await prisma.booking.findFirst({
        where: { id: bookingId, customerId },
    });

    if (!booking) throw AppError.notFound('Booking not found');

    if (booking.status !== BookingStatus.COMPLETED) {
        throw AppError.badRequest(
            'You can only rate a completed booking',
            'BOOKING_NOT_COMPLETED'
        );
    }

    if (booking.customerRating !== null) {
        throw AppError.conflict('You have already rated this booking', 'ALREADY_RATED');
    }

    return prisma.booking.update({
        where: { id: bookingId },
        data: {
            customerRating: data.driverRating,
            customerNote: data.customerNote,
        },
        select: {
            id: true,
            bookingNumber: true,
            customerRating: true,
            customerNote: true,
        },
    });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRIVER â€” GET ACTIVE BOOKING
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getDriverActiveBooking(userId: string) {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw AppError.notFound('Driver profile not found');

    const activeStatuses: BookingStatus[] = [
        BookingStatus.DRIVER_ASSIGNED,
        BookingStatus.DRIVER_ARRIVING,
        BookingStatus.PICKED_UP,
        BookingStatus.IN_TRANSIT,
        BookingStatus.DELIVERED,
    ];

    const booking = await prisma.booking.findFirst({
        where: {
            driverId: driver.id,
            status: { in: activeStatuses },
        },
        select: bookingDetailSelect,
    });

    return booking ?? null;
}

// ─────────────────────────────────────────────
// DRIVER — MARK ARRIVING (DRIVER_ASSIGNED → DRIVER_ARRIVING)
// ─────────────────────────────────────────────

export async function markDriverArriving(bookingId: string, userId: string) {
    const { booking } = await getDriverBooking(bookingId, userId);
    
    const updateData: any = {
        status: BookingStatus.DRIVER_ARRIVING,
        arrivalTime: new Date(),
    };
    
    // If OTP is missing (e.g. bypassed /accept via bidding), generate it now
    if (!(booking as any).pickupOtp) {
        updateData.pickupOtp = String(randomInt(1000, 9999));
    }

    if (booking.status !== BookingStatus.DRIVER_ARRIVING) {
        assertTransition(booking.status, BookingStatus.DRIVER_ARRIVING);
    }

    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: updateData,
        select: bookingDetailSelect,
    });

    logTransition({
        bookingId: updated.id,
        fromStatus: booking.status,
        toStatus: BookingStatus.DRIVER_ARRIVING,
        actor: { id: userId, role: 'DRIVER' },
    });

    // Notify customer — driver is arriving
    const customer = await prisma.user.findUnique({ where: { id: updated.customerId }, select: { fcmToken: true } });
    if (customer?.fcmToken) {
        await notificationService.sendToDevice(customer.fcmToken, {
            title: '🏃 Driver is Almost There!',
            body: `Your driver is ${Math.ceil(Math.random() * 5 + 2)} mins away. Keep your goods ready to load! 📦`,
            data: { type: 'DRIVER_ARRIVING', bookingId },
        });
    }
    
    const finalOtp = updateData.pickupOtp || (booking as any).pickupOtp;
    await createNotification(
        updated.customerId,
        'DRIVER_ARRIVING',
        `Your driver is on the way. Your pickup OTP is ${finalOtp}.`,
        NotificationType.BOOKING_STATUS,
        bookingId
    );
    const { emitToBookingRoom, emitToCustomerRoom } = await import('@shared/socket/socket.instance');
    // Sanitize booking room payload: do NOT broadcast secret pickup OTP to driver socket!
    emitToBookingRoom(bookingId, 'booking_update', { type: 'DRIVER_ARRIVING' });
    emitToCustomerRoom(updated.customerId, 'pickup_otp_generated', { bookingId, pickupOtp: finalOtp });

    return updated;
}

// ─────────────────────────────────────────────
// DRIVER — VERIFY PICKUP OTP (DRIVER_ARRIVING → PICKED_UP)
// ─────────────────────────────────────────────

export async function markPickedUp(bookingId: string, userId: string, otp?: string) {
    if (!otp || !otp.trim()) {
        throw AppError.badRequest(
            'Pickup verification requires customer OTP. Please ask customer for the code or use POST /bookings/:id/verify-pickup-otp',
            'OTP_REQUIRED'
        );
    }
    return verifyPickupOtp(bookingId, userId, otp.trim());
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRIVER â€” REQUEST POD OTP
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function requestPodOtp(
    bookingId: string,
    stopId: string,
    userId: string
) {
    const { booking } = await getDriverBooking(bookingId, userId);

    if (
        booking.status !== BookingStatus.PICKED_UP &&
        booking.status !== BookingStatus.IN_TRANSIT
    ) {
        throw AppError.badRequest(
            'Booking must be in PICKED_UP or IN_TRANSIT status to deliver a stop',
            'INVALID_BOOKING_STATUS'
        );
    }

    const stop = await prisma.bookingStop.findFirst({
        where: { id: stopId, bookingId },
    });
    if (!stop) throw AppError.notFound('Stop not found in this booking');
    if (stop.isCompleted) {
        throw AppError.conflict('This stop is already marked as delivered', 'STOP_ALREADY_DELIVERED');
    }

    // Generate 4 digit OTP
    const otp = randomInt(1000, 9999).toString();
    const redisClient = getRedis();
    await redisClient.setex(`POD_OTP:${bookingId}:${stopId}`, 900, otp); // 15 mins expiry

    // Send to customer
    const customer = await prisma.user.findUnique({ where: { id: booking.customerId } });
    if (customer?.fcmToken) {
        await notificationService.sendToDevice(customer.fcmToken, {
            title: 'Delivery Verification',
            body: `Your delivery OTP is ${otp}. Please share this with the driver.`,
        });
    }

    // Emit over socket so Customer App can show it in UI immediately
    const { emitToBookingRoom, emitToCustomerRoom } = await import('@shared/socket/socket.instance');
    // Sanitize room broadcast: do NOT leak customer delivery OTP into the shared booking room!
    emitToBookingRoom(bookingId, 'delivery_otp_requested', {
        bookingId,
        stopId,
    });
    // Deliver secret OTP exclusively to customer private channel
    emitToCustomerRoom(booking.customerId, 'delivery_otp_generated', {
        bookingId,
        stopId,
        otp,
    });

    return { success: true, message: 'OTP sent to customer' };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRIVER â€” DELIVER A STOP WITH POD
// When all stops done â†’ booking moves to DELIVERED automatically
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function verifyPodAndDeliverStop(
    bookingId: string,
    stopId: string,
    userId: string,
    otp: string,
    photoUrl: string
) {
    const { booking } = await getDriverBooking(bookingId, userId);

    if (
        booking.status !== BookingStatus.PICKED_UP &&
        booking.status !== BookingStatus.IN_TRANSIT
    ) {
        throw AppError.badRequest(
            'Booking must be in PICKED_UP or IN_TRANSIT status to deliver a stop',
            'INVALID_BOOKING_STATUS'
        );
    }

    // Verify the stop belongs to this booking
    const stop = await prisma.bookingStop.findFirst({
        where: { id: stopId, bookingId },
    });
    if (!stop) throw AppError.notFound('Stop not found in this booking');
    if (stop.isCompleted) {
        throw AppError.conflict('This stop is already marked as delivered', 'STOP_ALREADY_DELIVERED');
    }

    // Verify OTP
    const redisClient = getRedis();
    const redisKey = `POD_OTP:${bookingId}:${stopId}`;
    const storedOtp = await redisClient.get(redisKey);

    if (!storedOtp || storedOtp !== otp) {
        throw AppError.badRequest('Invalid or expired OTP', 'INVALID_OTP');
    }

    // Mark this stop as completed with POD details
    await prisma.bookingStop.update({
        where: { id: stopId },
        data: { 
            isCompleted: true,
            podPhotoUrl: photoUrl,
            podVerifiedAt: new Date()
        },
    });

    // Cleanup Redis
    await redisClient.del(redisKey);

    // Check if any stops still remain
    const remainingCount = await prisma.bookingStop.count({
        where: { bookingId, isCompleted: false },
    });

    // Determine next status
    const newStatus =
        remainingCount === 0 ? BookingStatus.DELIVERED : BookingStatus.IN_TRANSIT;

    assertTransition(booking.status, newStatus);

    const updateData: { status: BookingStatus; actualDeliveryTime?: Date } = {
        status: newStatus,
    };
    if (newStatus === BookingStatus.DELIVERED) {
        updateData.actualDeliveryTime = new Date();
    }

    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: updateData,
        select: bookingDetailSelect,
    });

    logTransition({
        bookingId: updated.id,
        fromStatus: booking.status,
        toStatus: newStatus,
        actor: { id: userId, role: 'DRIVER' },
    });

    if (newStatus === BookingStatus.DELIVERED) {
        eventBus.emit('booking.delivered', {
            bookingId: updated.id,
            customerId: updated.customerId,
            totalFare: updated.totalFare ?? 0,
        });
        logger.info(`Booking delivered: ${updated.bookingNumber}`);
    }

    return updated;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRIVER â€” COMPLETE BOOKING (DELIVERED â†’ COMPLETED)
// Called after payment is confirmed (Phase 9 will call this internally too)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function completeBooking(bookingId: string, userId: string) {
    const { booking, driver } = await getDriverBooking(bookingId, userId);

    // BUG-012: Idempotent return if already completed
    if (booking.status === BookingStatus.COMPLETED) {
        logger.info(`Booking ${bookingId} already completed; returning idempotent result`);
        return booking;
    }

    assertTransition(booking.status, BookingStatus.COMPLETED);

    const grandTotal = booking.grandTotal ?? booking.totalFare ?? 0;
    const paymentMethod = booking.paymentMethod ?? PaymentMethod.CASH;

    // FIN-003: Require confirmed online payment before completing non-cash bookings.
    // Completing an unpaid online booking would disburse platform/driver funds for money never collected.
    if (paymentMethod !== PaymentMethod.CASH && booking.paymentStatus !== PaymentStatus.PAID) {
        throw AppError.badRequest('Cannot complete booking: Online payment has not been received or confirmed.', 'PAYMENT_REQUIRED');
    }

    const updated = await prisma.$transaction(async (tx) => {
        // Atomic conditional state claim: only transition from DELIVERED or IN_TRANSIT
        const claim = await tx.booking.updateMany({
            where: {
                id: bookingId,
                status: { in: [BookingStatus.DELIVERED, BookingStatus.IN_TRANSIT] },
            },
            data: {
                status: BookingStatus.COMPLETED,
                ...(paymentMethod === PaymentMethod.CASH ? {
                    paymentStatus: PaymentStatus.PAID,
                    paymentRef: `CASH_COLLECTED_${Date.now()}`,
                } : {}),
            },
        });

        if (claim.count === 0) {
            const alreadyDone = await tx.booking.findUnique({
                where: { id: bookingId },
                select: bookingDetailSelect,
            });
            if (alreadyDone && alreadyDone.status === BookingStatus.COMPLETED) {
                return alreadyDone;
            }
            throw AppError.conflict('Booking is already completed or not in a deliverable state', 'INVALID_TRANSITION');
        }

        await tx.driver.updateMany({
            where: { id: driver.id, status: DriverStatus.ON_TRIP },
            data: { status: DriverStatus.AVAILABLE },
        });

        const completed = await tx.booking.findUnique({
            where: { id: bookingId },
            select: bookingDetailSelect,
        });

        return completed;
    });

    if (!updated) {
        throw AppError.notFound('Booking not found after completion');
    }

    logger.info(`Booking completed: ${updated.bookingNumber}`);

    // Generate a scratch card reward for the customer
    await generateScratchCard(updated.customerId, updated.id, updated.grandTotal ?? updated.totalFare ?? 0);

    // ── PHASE 9: Commission Settlement ──────────────────────────────────
    // Settle earnings and commissions. With FIN-003, settlement is idempotent and safe against retries.
    if (grandTotal > 0 && driver) {
        // Settle against the commercial booking award:
        // Only trips explicitly awarded to a fleet owner or with an explicit truck assignment entitle the fleet owner to settlement.
        // Independent driver trips (awardedFleetOwnerId === null) settle 100% to the driver.
        let fleetOwnerId = booking.awardedFleetOwnerId ?? null;
        if (!fleetOwnerId) {
            const assignment = await prisma.truckAssignment.findUnique({
                where: { bookingId },
                select: { fleetOwnerId: true },
            });
            fleetOwnerId = assignment?.fleetOwnerId ?? null;
        }

        try {
            await settleTripEarnings({
                bookingId,
                driverId:    driver.id,
                grossAmount: grandTotal,
                paymentMethod,
                fleetOwnerId: fleetOwnerId ?? undefined,
            });
        } catch (err) {
            logger.error(`[Settlement] Failed for booking ${bookingId}:`, err);
        }
    } else {
        logger.warn(`[Settlement] Skipped for booking ${bookingId} — no fare amount or driver`);
    }

    logTransition({
        bookingId: updated.id,
        fromStatus: booking.status,
        toStatus: BookingStatus.COMPLETED,
        actor: { id: userId, role: 'DRIVER' },
    });

    return updated;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRIVER â€” ACCEPT BOOKING (confirms DRIVER_ASSIGNED state, starts trip)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function driverAcceptBooking(bookingId: string, userId: string) {
    const driver = await prisma.driver.findUnique({
        where: { userId },
        include: { user: true, vehicle: true },
    });
    if (!driver) throw AppError.notFound('Driver profile not found');

    const marketplaceReservation = await prisma.bidAward.findFirst({
        where: {
            activeKey: { not: null },
            status: {
                in: [
                    BidAwardStatus.PAYMENT_PENDING,
                    BidAwardStatus.PAYMENT_RECONCILING,
                    BidAwardStatus.CONFIRMED,
                ],
            },
            bid: { driverId: driver.id },
            booking: {
                status: {
                    in: [
                        BookingStatus.CONFIRMED,
                        BookingStatus.DRIVER_ASSIGNED,
                        BookingStatus.DRIVER_ARRIVING,
                        BookingStatus.PICKED_UP,
                        BookingStatus.IN_TRANSIT,
                    ],
                },
            },
        },
        select: { bookingId: true },
    });
    if (marketplaceReservation) {
        throw AppError.conflict(
            marketplaceReservation.bookingId === bookingId
                ? 'This marketplace load is already assigned. Open it and start the trip.'
                : 'You already have a selected marketplace load',
            'MARKETPLACE_LOAD_RESERVED',
        );
    }

    // Guard: reject if driver is already on another trip
    if (driver.status === 'ON_TRIP') {
        throw AppError.conflict(
            'You are already on an active trip. Complete or cancel it before accepting a new booking.',
            'DRIVER_ALREADY_ON_TRIP'
        );
    }

    // Generate 4-digit pickup OTP
    const pickupOtp = String(randomInt(1000, 9999));

    // Two valid accept scenarios handled atomically with Redis distributed locking:
    // Flow A — Direct dispatch: dispatch notified multiple drivers via FCM.
    //   Booking is CONFIRMED with driverId=null.
    //   First driver to accept claims it by setting driverId + transitioning to DRIVER_ARRIVING.
    // Flow B — Fleet assignment: fleet owner pre-assigned this driver.
    //   Booking is DRIVER_ASSIGNED with driverId=this driver. Driver confirms.

    const lockKey = `lock:booking:assignment:${bookingId}`;
    await ConcurrencyLockService.runWithLock(
        lockKey,
        5000,
        'Another driver is currently accepting this booking. Please try another load.',
        async () => {
            assertTransition(BookingStatus.CONFIRMED, BookingStatus.DRIVER_ARRIVING);
            let acceptResult = await prisma.booking.updateMany({
                where: {
                    id: bookingId,
                    bookingMode: BookingMode.INSTANT,
                    driverId: null,
                    status: BookingStatus.CONFIRMED,
                },
                data: { driverId: driver.id, status: BookingStatus.DRIVER_ARRIVING, pickupOtp },
            });

            if (acceptResult.count === 0) {
                // Try fleet assignment flow
                assertTransition(BookingStatus.DRIVER_ASSIGNED, BookingStatus.DRIVER_ARRIVING);
                acceptResult = await prisma.booking.updateMany({
                    where: { id: bookingId, driverId: driver.id, status: BookingStatus.DRIVER_ASSIGNED },
                    data: { status: BookingStatus.DRIVER_ARRIVING, pickupOtp },
                });
            }

            if (acceptResult.count === 0) {
                throw AppError.conflict(
                    'Booking has already been claimed by another driver or is no longer available',
                    'BOOKING_NOT_AVAILABLE'
                );
            }

            // Driver is now on trip
            await prisma.driver.update({
                where: { id: driver.id },
                data: { status: 'ON_TRIP' },
            });
        }
    );

    // Fetch booking to get customerId for notification
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { customer: true, driver: { include: { user: true, vehicle: true } } },
    });

    // Notify customer and subscribers via WebSocket + Push
    if (booking?.customerId) {
        emitToCustomerRoom(booking.customerId, 'booking_assigned', {
            bookingId,
            driverId: driver.id,
            driverName: booking.driver?.user?.name ?? '',
            driverPhone: booking.driver?.user?.phone ?? '',
            pickupOtp,
            vehicleNumber: booking.driver?.vehicle?.registrationNo,
        });
        // Sanitize booking room broadcast: do NOT leak customer's secret pickupOtp to driver socket!
        emitToBookingRoom(bookingId, 'booking_assigned', {
            bookingId,
            driverId: driver.id,
            driverName: booking.driver?.user?.name ?? '',
        });

        // Also inform any other drivers who were reviewing/bidding that the load is claimed
        const conflictModal = DynamicModalService.buildConflictLostModal(bookingId);
        emitToBookingRoom(bookingId, 'booking_conflict_lost', conflictModal);

        const customer = await prisma.user.findUnique({ where: { id: booking.customerId } });
        if (customer?.fcmToken) {
            await notificationService.sendToDevice(customer.fcmToken, {
                title: '🚛 Your Driver is On The Way!',
                body: `Locked & loaded! Your driver accepted the booking. OTP: ${pickupOtp} — share when they arrive. 🔑`,
                data: { type: 'DRIVER_ARRIVING', bookingId, pickupOtp },
            });
        }
        await createNotification(
            booking.customerId,
            '🚛 Driver Accepted!',
            `Your driver is on the way. Your pickup OTP is ${pickupOtp}.`,
            NotificationType.BOOKING_STATUS,
            bookingId,
        );
    }

    logTransition({
        bookingId,
        fromStatus: booking?.status ?? BookingStatus.CONFIRMED,
        toStatus: BookingStatus.DRIVER_ARRIVING,
        actor: { id: driver.id, role: 'DRIVER' },
    });

    logger.info(`Driver ${driver.id} accepted booking ${bookingId}`);
    const acceptedBooking = await prisma.booking.findUnique({ where: { id: bookingId }, select: bookingDetailSelect });
    if (acceptedBooking) {
        (acceptedBooking as any).pickupOtp = null; // Do not disclose customer OTP to driver in response payload
    }
    return acceptedBooking;
}

// ─────────────────────────────────────────────────────────────────
// CANONICAL DRIVER ASSIGNMENT (CONFIRMED → DRIVER_ASSIGNED)
// Single canonical entrypoint used by Admin, Fleet, and System
// ─────────────────────────────────────────────────────────────────
export interface AssignDriverToBookingInput {
    bookingId: string;
    driverId: string;
    assignedBy?: string;
    requireMatchingVehicle?: boolean;
}

export async function assignDriverToBooking(input: AssignDriverToBookingInput) {
    const { bookingId, driverId, assignedBy = 'ADMIN', requireMatchingVehicle = true } = input;

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true, bookingNumber: true, vehicleType: true, customerId: true },
    });
    if (!booking) throw AppError.notFound('Booking not found');

    // Canonical lifecycle transition assertion: only CONFIRMED bookings may transition to DRIVER_ASSIGNED
    assertTransition(booking.status, BookingStatus.DRIVER_ASSIGNED);

    const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: { user: true, vehicle: true },
    });
    if (!driver) throw AppError.notFound('Driver not found');
    if (!driver.isActive || !driver.isDocVerified) {
        throw AppError.badRequest('Driver documents are not verified or driver is inactive', 'DRIVER_NOT_VERIFIED');
    }
    if (driver.status !== DriverStatus.AVAILABLE) {
        throw AppError.conflict('Driver is not available', 'DRIVER_NOT_AVAILABLE');
    }
    if (requireMatchingVehicle && booking.vehicleType && driver.vehicle) {
        if (driver.vehicle.type !== booking.vehicleType) {
            throw AppError.badRequest(
                `Driver vehicle type (${driver.vehicle.type}) does not match required booking vehicle type (${booking.vehicleType})`,
                'VEHICLE_TYPE_MISMATCH',
            );
        }
    }

    const updated = await prisma.$transaction(async (tx) => {
        // Atomically claim the driver
        const reservedDriver = await tx.driver.updateMany({
            where: {
                id: driverId,
                status: DriverStatus.AVAILABLE,
                isActive: true,
                isDocVerified: true,
            },
            data: { status: DriverStatus.ON_TRIP },
        });
        if (reservedDriver.count !== 1) {
            throw AppError.conflict('Driver is no longer available', 'DRIVER_NOT_AVAILABLE');
        }

        // Atomically transition booking
        const assigned = await tx.booking.updateMany({
            where: {
                id: bookingId,
                status: BookingStatus.CONFIRMED,
                driverId: null,
            },
            data: {
                driverId,
                status: BookingStatus.DRIVER_ASSIGNED,
                marketplaceVersion: { increment: 1 },
            },
        });
        if (assigned.count !== 1) {
            throw AppError.conflict('Booking changed before driver assignment', 'BOOKING_STATE_CONFLICT');
        }

        return tx.booking.findUniqueOrThrow({
            where: { id: bookingId },
            select: bookingDetailSelect,
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    logTransition({
        bookingId,
        fromStatus: booking.status,
        toStatus: BookingStatus.DRIVER_ASSIGNED,
        actor: { id: assignedBy, role: assignedBy },
        metadata: { driverId },
    });

    // Notify driver via FCM & in-app
    if (driver.user?.fcmToken) {
        await notificationService.sendToDevice(driver.user.fcmToken, {
            title: 'New Booking Assigned',
            body: `Booking ${booking.bookingNumber} has been assigned to you.`,
            data: { bookingId, type: 'BOOKING_ASSIGNED' },
        }).catch(err => logger.debug(`[Booking] FCM notify failed for driver ${driver.id}:`, err?.message));
    }
    if (driver.user?.id) {
        await createNotification(
            driver.user.id,
            'New Booking Assigned',
            `Booking ${booking.bookingNumber} has been assigned to you.`,
            NotificationType.BOOKING_STATUS,
            bookingId,
        ).catch(err => logger.debug(`[Booking] In-app notify failed for driver ${driver.id}:`, err?.message));
    }

    eventBus.emit('booking.driver_assigned', {
        bookingId: updated.id,
        driverId: driver.id,
        customerId: booking.customerId,
    });

    logger.info(`[Booking] Driver ${driver.id} assigned to booking ${booking.bookingNumber} by ${assignedBy}`);
    return updated;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRIVER â€” VERIFY PICKUP OTP (DRIVER_ARRIVING â†’ PICKED_UP)
// Driver enters the OTP shown to the customer. On success, trip starts.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function verifyPickupOtp(bookingId: string, userId: string, otp: string) {
    const { booking, driver } = await getDriverBooking(bookingId, userId);

    assertTransition(booking.status, BookingStatus.PICKED_UP);

    const storedOtp = (booking as any).pickupOtp as string | null;
    if (!storedOtp) {
        throw AppError.internal('Pickup OTP not found for this booking');
    }
    if (storedOtp !== otp.trim()) {
        throw AppError.badRequest('Invalid OTP. Please ask the customer for the correct code.', 'INVALID_OTP');
    }

    const pickedUpAt = new Date();

    // Compute waiting charge if arrivalTime was recorded
    let waitingCharge = 0;
    if ((booking as any).arrivalTime) {
        try {
            const vehicle = await prisma.vehicleTypePricing.findUnique({
                where: { vehicleType: booking.vehicleType as any },
            });
            if (vehicle) {
                const { pricingService } = await import('@modules/pricing/pricing.service');
                const waitingResult = pricingService.calculateWaitingCharge(
                    (booking as any).arrivalTime,
                    pickedUpAt,
                    vehicle,
                );
                waitingCharge = waitingResult.waitingCharge;
            }
        } catch (err) {
            logger.error('[Booking] Failed to compute waiting charge on OTP verify:', err);
        }
    }

    const updatedGrandTotal = (booking.grandTotal ?? booking.totalFare ?? 0) + waitingCharge;

    const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
            status: BookingStatus.PICKED_UP,
            actualPickupTime: pickedUpAt,
            pickupOtp: null, // Clear OTP after use for security
            ...(waitingCharge > 0 && {
                waitingCharge,
                grandTotal: updatedGrandTotal,
            }),
        },
        select: bookingDetailSelect,
    });

    logTransition({
        bookingId: updated.id,
        fromStatus: booking.status,
        toStatus: BookingStatus.PICKED_UP,
        actor: { id: userId, role: 'DRIVER' },
    });

    // Emit socket event so customer UI transitions immediately
    const { emitToBookingRoom } = await import('@shared/socket/socket.instance');
    try {
        emitToBookingRoom(bookingId, 'pickup_otp_verified', {
            bookingId,
            status: 'PICKED_UP',
        });
    } catch (_) { /* socket may not be available in test env */ }

    // Notify customer
    const customer = await prisma.user.findUnique({
        where: { id: booking.customerId },
        select: { fcmToken: true },
    });
    if (customer?.fcmToken) {
        await notificationService.sendToDevice(customer.fcmToken, {
            title: 'ðŸ“¦ Goods Loaded â€” Rolling!',
            body: 'Your goods are loaded and the truck is heading to the destination. Sit back! ðŸ›£ï¸�',
            data: { type: 'GOODS_LOADED', bookingId },
        });
    }
    await createNotification(
        booking.customerId,
        'ðŸ“¦ Goods Loaded â€” Rolling!',
        'Your goods are loaded. The driver is heading to the destination.',
        NotificationType.BOOKING_STATUS,
        bookingId,
    );

    logger.info(`Driver ${driver.id} verified pickup OTP for booking ${bookingId}`);
    return updated;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRIVER â€” SAVE LOCATION HISTORY (called from Socket.IO location event)
// Saves a GPS breadcrumb for admin/fleet panel tracking history.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function saveLocationHistory(params: {
    bookingId: string;
    driverId: string;
    lat: number;
    lng: number;
    speedKmh?: number;
    headingDeg?: number;
    accuracyM?: number;
    tripPhase?: string;
}) {
    try {
        await prisma.bookingLocationHistory.create({
            data: {
                bookingId: params.bookingId,
                driverId: params.driverId,
                latitude: params.lat,
                longitude: params.lng,
                speedKmh: params.speedKmh,
                headingDeg: params.headingDeg,
                accuracyM: params.accuracyM,
                tripPhase: params.tripPhase,
            },
        });
    } catch (err) {
        logger.error('[LocationHistory] Failed to save:', err);
        // Non-fatal â€” never block the GPS update
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRIVER â€” DECLINE BOOKING (unassigns driver, reverts to CONFIRMED for re-dispatch)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function driverDeclineBooking(bookingId: string, userId: string) {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw AppError.notFound('Driver profile not found');

    const bookingMode = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { bookingMode: true },
    });
    if (bookingMode?.bookingMode === BookingMode.PRIVATE_BID) {
        throw AppError.conflict(
            'A secured marketplace award cannot be declined through broadcast dispatch',
            'MARKETPLACE_AWARD_CANCELLATION_REQUIRED',
        );
    }

    const booking = await prisma.booking.findFirst({
        where: { 
            id: bookingId,
            // A driver can decline if it's explicitly assigned to them OR if it's broadcasted (CONFIRMED & driverId null)
            OR: [
                { driverId: driver.id, status: BookingStatus.DRIVER_ASSIGNED },
                { driverId: null, status: BookingStatus.CONFIRMED }
            ]
        },
    });
    if (!booking) throw AppError.notFound('Booking not found or already accepted/declined');
    if (booking.status === BookingStatus.DRIVER_ASSIGNED) {
        assertTransition(booking.status, BookingStatus.CONFIRMED);
    }

    // Unassign driver, revert to CONFIRMED, increment declineCount
    await prisma.booking.update({
        where: { id: bookingId },
        data: {
            driverId: null,
            status: BookingStatus.CONFIRMED,
            declineCount: { increment: 1 },
        },
    });

    logTransition({
        bookingId,
        fromStatus: booking.status,
        toStatus: BookingStatus.CONFIRMED,
        actor: { id: driver.id, role: 'DRIVER' },
    });

    // Driver back to AVAILABLE
    await prisma.driver.update({
        where: { id: driver.id },
        data: { status: 'AVAILABLE' },
    });

    // Notify customer that we are finding another driver
    const customer = await prisma.user.findUnique({ where: { id: booking.customerId } });
    if (customer?.fcmToken) {
        await notificationService.sendToDevice(customer.fcmToken, {
            title: 'Finding Another Driver',
            body: 'Your previous driver is unavailable. We are finding you another driver now.',
            data: { type: 'DRIVER_DECLINED', bookingId },
        });
    }
    await createNotification(
        booking.customerId,
        'Finding Another Driver',
        'Your previous driver is unavailable. We are finding you another driver now.',
        NotificationType.BOOKING_STATUS,
        bookingId,
    );

    // Trigger re-dispatch asynchronously (non-blocking â€” runs after response is sent)
    handleDriverDecline(bookingId).catch(err =>
        logger.error(`[Booking] Re-dispatch trigger failed for ${bookingId}:`, err)
    );

    logger.info(`Driver ${driver.id} declined booking ${bookingId} â€” re-dispatching`);
    return { success: true, message: 'Booking declined â€” finding next driver' };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENTERPRISE LIVE BIDDING
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createBid(bookingId: string, driverUserId: string, data: any) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw AppError.notFound('Booking not found');
    const pickupCommitmentAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    return MarketplaceService.submitBid(
        bookingId,
        { userId: driverUserId, role: UserRole.DRIVER },
        {
            idempotencyKey: randomUUID(),
            amount: data.amount,
            pickupCommitmentAt,
            transitMinutes: booking.estimatedDuration ?? 60,
            validForMinutes: Math.min(10, booking.bidWindowMinutes),
            inclusions: [],
            exclusions: [],
            note: data.note,
        },
    );
}

export async function getBids(bookingId: string, userId: string, role: string) {
    const result = await MarketplaceService.listBookingBids(bookingId, { userId, role });
    return result.bids;
}

export async function acceptBid(bookingId: string, customerId: string, bidId: string) {
    const bid = await MarketplaceService.getBidThread(bidId, { userId: customerId, role: UserRole.CUSTOMER });
    if (bid.bookingId !== bookingId) throw AppError.notFound('Bid not found for this booking');
    if (!bid.latestRevisionId) throw AppError.conflict('Bid has no active revision');
    return MarketplaceService.acceptExactRevision(
        bidId,
        bid.latestRevisionId,
        { userId: customerId, role: UserRole.CUSTOMER },
    );
}