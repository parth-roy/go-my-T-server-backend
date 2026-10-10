import { Router } from 'express';
import multer from 'multer';
import { validate } from '@shared/middleware/validate';
import { authenticate, requireRole, optionalAuth } from '@shared/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import * as ctrl from './leads.controller';
import * as workforceCtrl from '@modules/workforce/workforce.controller';
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

// Log WhatsApp modal submission → Google Sheets & DB (no auth required for customer submissions)
publicLeadsRouter.post('/whatsapp-log', ctrl.logWhatsAppMessage);
publicLeadsRouter.post('/gmt-whatsapp-log', ctrl.logGMTWhatsAppMessage);

// ── Driver-End WhatsApp Leads Marketplace API ──
// Allows drivers to view available booking leads submitted via WhatsApp
publicLeadsRouter.get('/driver/whatsapp-leads', optionalAuth, ctrl.getDriverWhatsAppLeads);
publicLeadsRouter.get('/driver/whatsapp-leads/:id', optionalAuth, ctrl.getWhatsAppInquiryById);
publicLeadsRouter.patch(
  '/driver/whatsapp-leads/:id/accept',
  authenticate,
  requireRole(UserRole.DRIVER, UserRole.FLEET_OWNER, UserRole.ADMIN),
  ctrl.acceptDriverWhatsAppLead
);

// ── Worker-End WhatsApp Jobs Marketplace API ──
// Allows workers to view and accept direct workforce inquiries submitted via WhatsApp
publicLeadsRouter.get('/worker/whatsapp-jobs', optionalAuth, workforceCtrl.getWorkerWhatsAppJobs);
publicLeadsRouter.get('/worker/whatsapp-jobs/:id', optionalAuth, workforceCtrl.getWorkerWhatsAppJobById);
publicLeadsRouter.patch(
  '/worker/whatsapp-jobs/:id/accept',
  authenticate,
  requireRole(UserRole.WORKER, UserRole.ADMIN),
  workforceCtrl.acceptWorkerWhatsAppJob
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

adminLeadsRouter.get(
  '/whatsapp-inquiries',
  ctrl.getAdminWhatsAppInquiries
);
