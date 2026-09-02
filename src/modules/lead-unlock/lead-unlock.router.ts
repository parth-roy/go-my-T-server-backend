import { Router } from 'express';
import { authenticate } from '@shared/middleware/auth.middleware';
import { validate } from '@shared/middleware/validate';
import * as ctrl from './lead-unlock.controller';
import {
  InitiateLeadUnlockSchema,
  VerifyLeadUnlockSchema,
  PreviewNearbyExpertsSchema,
} from './lead-unlock.schema';

export const leadUnlockRouter = Router();

// Public / Pre-auth preview of masked experts in area
leadUnlockRouter.get('/preview', validate(PreviewNearbyExpertsSchema, 'query'), ctrl.preview);

// Authenticated flows
leadUnlockRouter.post('/initiate', authenticate, validate(InitiateLeadUnlockSchema), ctrl.initiate);
leadUnlockRouter.post('/verify', authenticate, validate(VerifyLeadUnlockSchema), ctrl.verify);
leadUnlockRouter.get('/:transactionId/workers', authenticate, ctrl.getUnlocked);
