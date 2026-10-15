import { Router } from 'express';
import { authenticate, optionalAuth, requireRole } from '@shared/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import * as PaymentController from './payment.controller';

export const paymentRouter = Router();

// Webhook must be public and use express.json or raw body for signature verification
// Typically handled in main app.ts, but assuming express.json is applied globally
paymentRouter.post('/webhook', PaymentController.razorpayWebhook);
paymentRouter.post('/cashfree-webhook', PaymentController.cashfreeWebhook);

// Direct Contact: Rs.49 / Rs.99 Worker Number Unlock (Public flow)
paymentRouter.post('/create-direct-contact-order', PaymentController.createDirectContactOrder);
paymentRouter.post('/verify-direct-contact', PaymentController.verifyDirectContactPayment);
paymentRouter.post('/cashfree-create-order', PaymentController.createDirectContactCashfreeOrder);
paymentRouter.post('/cashfree-verify', PaymentController.verifyDirectContactCashfreePayment);
paymentRouter.post('/submit-direct-contact-request', PaymentController.submitDirectContactRequest);
paymentRouter.get('/check-direct-contact-status', optionalAuth, PaymentController.checkDirectContactStatus);

// Admin Direct Contact & Multi-Platform Payment Management (Restricted to authenticated ADMIN)
paymentRouter.get('/admin/direct-contact-requests', authenticate, requireRole(UserRole.ADMIN), PaymentController.getAdminDirectContactRequests);
paymentRouter.post('/admin/verify-direct-contact-request', authenticate, requireRole(UserRole.ADMIN), PaymentController.adminVerifyDirectContactRequest);
paymentRouter.post('/admin-approve-utr', authenticate, requireRole(UserRole.ADMIN), PaymentController.adminApproveUtr);
paymentRouter.get('/admin/transactions', authenticate, requireRole(UserRole.ADMIN), PaymentController.getAdminPaymentTransactions);

paymentRouter.use(authenticate);

paymentRouter.post('/create-order', PaymentController.createOrder);
paymentRouter.post('/verify', PaymentController.verifyPayment);
paymentRouter.post('/mock-success', PaymentController.mockPaymentSuccess);