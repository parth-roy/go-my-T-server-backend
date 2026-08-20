import { Router } from 'express';
import multer from 'multer';
import { validate } from '@shared/middleware/validate';
import { authenticate, requireRole, optionalAuth } from '@shared/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import * as ctrl from './leads.controller';
import {
  CreateLeadSchema,
  GetLeadsQuerySchema,
  UpdateLeadStatusSchema
} from './leads.schema';

export const publicLeadsRouter = Router();
export const adminLeadsRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

// ── Public Routes (For website forms) ──
publicLeadsRouter.post(
  '/',
  optionalAuth,
  upload.any(),
  // We'll skip validate(CreateLeadSchema) here because it doesn't handle files and new fields yet.
  ctrl.createLead
);

// ── Admin Routes (Protected) ──
adminLeadsRouter.use(authenticate, requireRole(UserRole.ADMIN));

adminLeadsRouter.get(
  '/',
  validate(GetLeadsQuerySchema, 'query'),
  ctrl.getLeads
);

adminLeadsRouter.get(
  '/workforce',
  validate(GetLeadsQuerySchema, 'query'),
  ctrl.getWorkforceLeads
);

adminLeadsRouter.patch(
  '/:id/status',
  validate(UpdateLeadStatusSchema),
  ctrl.updateLeadStatus
);
