import { prisma } from '@shared/db/prisma';
import { logger } from '@shared/logger';
import { AppError } from '@shared/errors/AppError';
import { DriverActionType, DispatchAlertSeverity, Prisma } from '@prisma/client';
import { emitToAdminOpsRoom } from '@shared/socket/socket.instance';
import type { DriverEngagementInput, DisintermediationFeedQuery } from './telemetry.schema';

export class TelemetryService {
    /**
     * Record a telemetry engagement action performed by a driver (e.g. Call Shipper, WhatsApp, Details Viewed)
     */
    static async recordDriverEngagement(userId: string, input: DriverEngagementInput) {
        const driver = await prisma.driver.findUnique({
            where: { userId },
            include: { user: { select: { id: true, name: true, phone: true } } },
        });

        if (!driver) {
            throw AppError.notFound('Driver profile not found');
        }

        let targetBookingId = input.bookingId;
        let booking = await prisma.booking.findUnique({
            where: { id: targetBookingId },
            include: { customer: { select: { id: true, name: true, phone: true } } },
        });

        if (!booking) {
            // Check if input.bookingId is a BrokerLoad ID referencing a source booking
            const brokerLoad = await prisma.brokerLoad.findUnique({
                where: { id: targetBookingId },
            });
            if (brokerLoad?.sourceBookingId) {
                targetBookingId = brokerLoad.sourceBookingId;
                booking = await prisma.booking.findUnique({
                    where: { id: targetBookingId },
                    include: { customer: { select: { id: true, name: true, phone: true } } },
                });
            }
        }

        if (!booking) {
            logger.warn(`[Telemetry] Booking not found for ID ${input.bookingId}, skipping engagement audit`);
            return null;
        }

        // 1. Create audit log in database
        const audit = await prisma.driverEngagementAudit.create({
            data: {
                bookingId: targetBookingId,
                driverId: driver.id,
                action: input.action,
                driverLat: input.driverLat ?? null,
                driverLng: input.driverLng ?? null,
                metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
            },
        });

        // 2. Anti-Disintermediation Heuristic:
        // When a driver taps PHONE_CALL_INITIATED or WHATSAPP_CLICKED on a load that is not yet assigned to them,
        // flag it immediately to the Admin Operations room to prevent off-platform cash deals.
        const isOffPlatformContactAttempt =
            input.action === DriverActionType.PHONE_CALL_INITIATED ||
            input.action === DriverActionType.WHATSAPP_CLICKED ||
            input.action === DriverActionType.CONTACT_UNMASKED;

        if (isOffPlatformContactAttempt && booking.driverId !== driver.id) {
            logger.warn(
                `[AntiDisintermediation] Driver ${driver.user.name} (${driver.user.phone}) initiated direct contact (${input.action}) for unassigned booking ${booking.bookingNumber}`
            );

            // Create admin alert if not already alerted for this booking + driver
            const existingAlert = await prisma.adminDispatchAlert.findFirst({
                where: {
                    bookingId: booking.id,
                    severity: DispatchAlertSeverity.SUSPECTED_DISINTERMEDIATION,
                    reason: { contains: driver.id },
                },
            });

            if (!existingAlert) {
                await prisma.adminDispatchAlert.create({
                    data: {
                        bookingId: booking.id,
                        severity: DispatchAlertSeverity.SUSPECTED_DISINTERMEDIATION,
                        reason: `Driver ${driver.user.name} (${driver.user.phone}, driverId: ${driver.id}) initiated direct external contact (${input.action}) on unassigned load`,
                    },
                });
            }

            // Real-time broadcast to Admin Ops monitoring room
            emitToAdminOpsRoom('suspected_disintermediation_alert', {
                auditId: audit.id,
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                driverId: driver.id,
                driverName: driver.user.name,
                driverPhone: driver.user.phone,
                customerName: booking.customer.name,
                customerPhone: booking.customer.phone,
                action: input.action,
                timestamp: audit.createdAt,
            });
        }

        return audit;
    }

    /**
     * Retrieve disintermediation and engagement audit records for Admin dashboard
     */
    static async getDisintermediationFeed(query: DisintermediationFeedQuery) {
        const { page, limit, action, driverId } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (action) where.action = action;
        if (driverId) where.driverId = driverId;

        const [items, total] = await Promise.all([
            prisma.driverEngagementAudit.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    driver: {
                        include: {
                            user: { select: { id: true, name: true, phone: true } },
                            vehicle: { select: { id: true, registrationNo: true, type: true } },
                        },
                    },
                    booking: {
                        select: {
                            id: true,
                            bookingNumber: true,
                            pickupAddress: true,
                            dropAddress: true,
                            totalFare: true,
                            status: true,
                            customer: { select: { id: true, name: true, phone: true } },
                        },
                    },
                },
            }),
            prisma.driverEngagementAudit.count({ where }),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
