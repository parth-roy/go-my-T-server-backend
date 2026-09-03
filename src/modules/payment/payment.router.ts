import { Router } from 'express';
import { authenticate } from '@shared/middleware/auth.middleware';
import * as PaymentController from './payment.controller';

export const paymentRouter = Router();

// Webhook must be public and use express.json or raw body for signature verification
// Typically handled in main app.ts, but assuming express.json is applied globally
paymentRouter.post('/webhook', PaymentController.razorpayWebhook);

// Direct Contact: Rs.49 Worker Number Unlock (Public flow)
paymentRouter.post('/create-direct-contact-order', PaymentController.createDirectContactOrder);
paymentRouter.post('/verify-direct-contact', PaymentController.verifyDirectContactPayment);
paymentRouter.post('/admin-approve-utr', PaymentController.adminApproveUtr);

paymentRouter.use(authenticate);

paymentRouter.post('/create-order', PaymentController.createOrder);
paymentRouter.post('/verify', PaymentController.verifyPayment);
paymentRouter.post('/mock-success', PaymentController.mockPaymentSuccess);