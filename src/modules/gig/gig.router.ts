import { Router } from 'express';
import { authenticate, requireRole } from '@shared/middleware/auth.middleware';
import { validate } from '@shared/middleware/validate';
import * as ctrl from './gig.controller';
import * as schema from './gig.schema';
import * as chatCtrl from '../workforce/workforce.chat.controller';
import { UserRole } from '@prisma/client';

export const gigRouter = Router();

// ── Public ───────────────────────────────────────────────────────────────────

/** GET /gig/catalog — skill categories, zone rates, urgency options (no auth needed) */
gigRouter.get('/catalog', ctrl.getGigCatalog);

/** GET /gig/public/jobs — public active gig openings (with optional city & limit query) */
gigRouter.get('/public/jobs', ctrl.getPublicJobs);

/** POST /gig/estimate — fare preview before booking (no auth needed) */
gigRouter.post(
  '/estimate',
  validate(schema.estimateGigSchema),
  ctrl.estimateGig,
);

// ── Customer ─────────────────────────────────────────────────────────────────

gigRouter.post(
  '/customer',
  authenticate,
  requireRole(UserRole.CUSTOMER, UserRole.WORKER, UserRole.ADMIN),
  validate(schema.createGigSchema),
  ctrl.createGig,
);

gigRouter.get(
  '/customer',
  authenticate,
  requireRole(UserRole.CUSTOMER, UserRole.WORKER, UserRole.ADMIN),
  ctrl.getCustomerGigs,
);

gigRouter.get(
  '/customer/:id',
  authenticate,
  requireRole(UserRole.CUSTOMER, UserRole.WORKER, UserRole.ADMIN),
  ctrl.getCustomerGigById,
);

gigRouter.post(
  '/customer/:id/create-payment-order',
  authenticate,
  requireRole(UserRole.CUSTOMER, UserRole.WORKER, UserRole.ADMIN),
  ctrl.createGigPaymentOrder,
);

gigRouter.post(
  '/customer/:id/verify-payment',
  authenticate,
  requireRole(UserRole.CUSTOMER, UserRole.WORKER, UserRole.ADMIN),
  validate(schema.verifyGigPaymentSchema),
  ctrl.verifyGigPayment,
);

gigRouter.post(
  '/customer/:id/cancel',
  authenticate,
  requireRole(UserRole.CUSTOMER, UserRole.WORKER, UserRole.ADMIN),
  validate(schema.cancelGigSchema),
  ctrl.cancelGig,
);

gigRouter.post(
  '/:id/cancel',
  authenticate,
  requireRole(UserRole.CUSTOMER, UserRole.WORKER, UserRole.ADMIN),
  validate(schema.cancelGigSchema),
  ctrl.cancelGig,
);

// ── Workforce ─────────────────────────────────────────────────────────────────

gigRouter.get(
  '/nearby',
  authenticate,
  requireRole(UserRole.WORKER),
  ctrl.getNearbyGigs,
);

gigRouter.post(
  '/:id/accept',
  authenticate,
  requireRole(UserRole.WORKER),
  ctrl.acceptGig,
);

/** GET /gig/worker/applications — worker's applications list */
gigRouter.get(
  '/worker/applications',
  authenticate,
  ctrl.getWorkerApplications,
);

/** POST /gig/worker/apply — worker 1-click apply */
gigRouter.post(
  '/worker/apply',
  authenticate,
  ctrl.applyWorkerJob,
);

// ── Admin ─────────────────────────────────────────────────────────────────────

gigRouter.get(
  '/admin',
  authenticate,
  requireRole(UserRole.ADMIN),
  ctrl.getAllGigsAdmin,
);

gigRouter.get(
  '/admin/:id',
  authenticate,
  requireRole(UserRole.ADMIN),
  ctrl.getGigByIdAdmin,
);

// ── Chats (Hirer & Assigned Worker) ──────────────────────────────────────────

gigRouter.get(
  '/chats',
  authenticate,
  chatCtrl.getUserConversations,
);

gigRouter.get(
  '/chats/:gigId/messages',
  authenticate,
  chatCtrl.getConversationMessages,
);

gigRouter.post(
  '/chats/:gigId/messages',
  authenticate,
  chatCtrl.sendGigMessage,
);
