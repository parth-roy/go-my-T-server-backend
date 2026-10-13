import { Router } from 'express';
import { authenticate, requireRole } from '@shared/middleware/auth.middleware';
import { validate } from '@shared/middleware/validate';
import { UserRole } from '@prisma/client';
import { driverEngagementSchema } from './telemetry.schema';
import { TelemetryController } from './telemetry.controller';

export const telemetryRouter = Router();

// Driver telemetry logging (Call, WhatsApp, Contact view)
telemetryRouter.post(
    '/driver-engagement',
    authenticate,
    validate(driverEngagementSchema),
    TelemetryController.recordEngagement
);

// Admin anti-disintermediation feed
telemetryRouter.get(
    '/disintermediation-feed',
    authenticate,
    requireRole(UserRole.ADMIN),
    TelemetryController.getDisintermediationFeed
);
