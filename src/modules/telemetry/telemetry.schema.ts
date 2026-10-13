import { z } from 'zod';
import { DriverActionType, DispatchAlertSeverity } from '@prisma/client';

export const driverEngagementSchema = z.object({
    bookingId: z.string().uuid(),
    action: z.nativeEnum(DriverActionType),
    driverLat: z.number().optional(),
    driverLng: z.number().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export type DriverEngagementInput = z.infer<typeof driverEngagementSchema>;

export const disintermediationFeedQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
    action: z.nativeEnum(DriverActionType).optional(),
    driverId: z.string().uuid().optional(),
});

export type DisintermediationFeedQuery = z.infer<typeof disintermediationFeedQuerySchema>;

export const dispatchAlertsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
    isResolved: z.enum(['true', 'false', 'all']).optional().default('false'),
    severity: z.nativeEnum(DispatchAlertSeverity).optional(),
});

export type DispatchAlertsQuery = z.infer<typeof dispatchAlertsQuerySchema>;

export const resolveDispatchAlertSchema = z.object({
    notes: z.string().optional(),
});

export type ResolveDispatchAlertInput = z.infer<typeof resolveDispatchAlertSchema>;
