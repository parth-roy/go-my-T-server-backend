import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, requireRole } from '@shared/middleware/auth.middleware';
import { validate } from '@shared/middleware/validate';
import * as BrokerController from './broker.controller';
import {
  postBrokerLoadSchema,
  submitBrokerQuoteSchema,
  reviewBrokerQuoteSchema,
  confirmAdvanceSchema,
  verifyLoadingOtpSchema,
  settleBountySchema,
  brokerLoadsQuerySchema,
  adminAgentsQuerySchema,
  updateAgentKycSchema,
  updateBrokerConfigSchema,
} from './broker.schema';

export const brokerRouter = Router();

brokerRouter.use(authenticate);

// Customer routes (CUSTOMER role)
brokerRouter.post(
  '/loads',
  requireRole(UserRole.CUSTOMER),
  validate(postBrokerLoadSchema),
  BrokerController.postBrokerLoad
);

brokerRouter.get(
  '/loads',
  requireRole(UserRole.MIDDLEMAN, UserRole.ADMIN),
  validate(brokerLoadsQuerySchema, 'query'),
  BrokerController.listBrokerLoads
);

brokerRouter.get(
  '/loads/:loadId',
  requireRole(UserRole.MIDDLEMAN, UserRole.ADMIN, UserRole.CUSTOMER),
  BrokerController.getBrokerLoad
);

// Broker (MIDDLEMAN) routes
brokerRouter.post(
  '/loads/:loadId/quote',
  requireRole(UserRole.MIDDLEMAN),
  validate(submitBrokerQuoteSchema),
  BrokerController.submitBrokerQuote
);

// Driver routes
brokerRouter.post(
  '/loads/:loadId/confirm-loading',
  requireRole(UserRole.DRIVER),
  validate(verifyLoadingOtpSchema),
  BrokerController.confirmPhysicalLoading
);

// Admin / Ops routes
brokerRouter.patch(
  '/quotes/:quoteId/review',
  requireRole(UserRole.ADMIN),
  validate(reviewBrokerQuoteSchema),
  BrokerController.reviewBrokerQuote
);

brokerRouter.patch(
  '/loads/:loadId/confirm-advance',
  requireRole(UserRole.ADMIN),
  validate(confirmAdvanceSchema),
  BrokerController.confirmAdvanceCollected
);

brokerRouter.patch(
  '/loads/:loadId/driver-dropout',
  requireRole(UserRole.ADMIN),
  BrokerController.markDriverDropout
);

brokerRouter.patch(
  '/bounty/:quoteId/settle',
  requireRole(UserRole.ADMIN),
  validate(settleBountySchema),
  BrokerController.settleBounty
);

brokerRouter.get(
  '/admin/bounty-dashboard',
  requireRole(UserRole.ADMIN),
  BrokerController.getAdminBountyDashboard
);

brokerRouter.get(
  '/admin/agents',
  requireRole(UserRole.ADMIN),
  validate(adminAgentsQuerySchema, 'query'),
  BrokerController.getAdminAgents
);

brokerRouter.patch(
  '/admin/agents/:agentId/kyc',
  requireRole(UserRole.ADMIN),
  validate(updateAgentKycSchema),
  BrokerController.updateAgentKyc
);

brokerRouter.get(
  '/admin/config',
  requireRole(UserRole.ADMIN),
  BrokerController.getBrokerConfig
);

brokerRouter.patch(
  '/admin/config',
  requireRole(UserRole.ADMIN),
  validate(updateBrokerConfigSchema),
  BrokerController.updateBrokerConfig
);

