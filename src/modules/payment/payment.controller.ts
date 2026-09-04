import { prisma } from '@shared/db/prisma';
import { Request, Response, NextFunction } from 'express';
import {
    PrismaClient,
    PaymentStatus,
    BookingStatus,
    BookingMode,
    BidAwardStatus,
    PaymentMethod,
    PlatformSource,
    PaymentType,
    TransactionPaymentStatus,
} from '@prisma/client';
import { sendSuccess } from '@shared/utils/response';
import { AppError } from '@shared/errors/AppError';
import { completeBooking } from '@modules/booking/booking.service';
import crypto from 'crypto';
import { finalizePaidAward } from '@modules/marketplace/marketplace.service';
import { razorpay } from './razorpay.client';
import { secureCapturedBookingPayment } from './booking-payment.service';
import { logger } from '@shared/logger';


// ─────────────────────────────────────────────
// CREATE ORDER
// ─────────────────────────────────────────────
export async function createOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const { bookingId, platform } = req.body;

        if (!bookingId || typeof bookingId !== 'string') {
            throw AppError.badRequest('bookingId is required');
        }

        const userId = req.user!.id;

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) throw AppError.notFound('Booking not found');

        if (booking.customerId !== userId && req.user!.role !== 'ADMIN') {
            throw AppError.forbidden('Access denied');
        }

        if (booking.paymentStatus === PaymentStatus.PAID) {
            throw AppError.conflict('Booking is already paid');
        }

        if (booking.paymentStatus === PaymentStatus.REFUNDED) {
            throw AppError.conflict('Booking payment has been refunded');
        }

        if (booking.bookingMode === BookingMode.PRIVATE_BID) {
            const award = await prisma.bidAward.findFirst({
                where: {
                    bookingId,
                    activeKey: bookingId,
                    status: { in: [BidAwardStatus.PAYMENT_PENDING, BidAwardStatus.PAYMENT_RECONCILING] },
                },
            });
            if (!award) throw AppError.conflict('Select an active bid before creating payment', 'BID_AWARD_REQUIRED');
            if (award.paymentDeadline.getTime() <= Date.now() && !booking.razorpayOrderId) {
                throw AppError.conflict('Bid payment deadline has expired', 'PAYMENT_DEADLINE_EXPIRED');
            }
        }

        // FIX HIGH-15: Idempotency — return the existing unpaid order if one exists,
        // preventing duplicate charges from double-clicks.
        if ((booking as any).razorpayOrderId && booking.paymentStatus === PaymentStatus.PENDING) {
            try {
                const existingOrder = await razorpay.orders.fetch((booking as any).razorpayOrderId);
                if ((existingOrder as any).status === 'created') {
                    sendSuccess(res, {
                        orderId: existingOrder.id,
                        amount: existingOrder.amount,
                        currency: existingOrder.currency,
                        keyId: process.env.RAZORPAY_KEY_ID,
                    }, 'Existing order returned (idempotent)');
                    return;
                }
            } catch {
                // Fetch failed — order expired or invalid; fall through to create a new one
            }
        }

        const fareAmount = (booking.grandTotal ?? booking.totalFare ?? 0);
        const amountInPaise = Math.round(fareAmount * 100);

        if (amountInPaise <= 0) {
            throw AppError.badRequest('Booking has no valid fare amount. Please ensure the booking is confirmed with a calculated fare before payment.');
        }

        if (amountInPaise < 100) {
            throw AppError.badRequest('Payment amount must be at least ₹1.00');
        }

        // Standardized platform source
        const validPlatform = (platform && Object.values(PlatformSource).includes(platform as PlatformSource))
            ? (platform as PlatformSource)
            : PlatformSource.CUSTOMER_APP;

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: bookingId.slice(0, 40),
            notes: {
                platform: validPlatform,
                paymentType: PaymentType.LOGISTICS_BOOKING,
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                customerId: booking.customerId,
            },
        });

        // Record multi-platform payment transaction
        try {
            await prisma.paymentTransaction.upsert({
                where: { razorpayOrderId: order.id },
                create: {
                    platform: validPlatform,
                    paymentType: PaymentType.LOGISTICS_BOOKING,
                    amount: fareAmount,
                    currency: 'INR',
                    status: TransactionPaymentStatus.PENDING,
                    razorpayOrderId: order.id,
                    entityId: bookingId,
                    userId: booking.customerId,
                    notes: order.notes as any,
                },
                update: {
                    status: TransactionPaymentStatus.PENDING,
                    amount: fareAmount,
                    platform: validPlatform,
                },
            });
        } catch (txErr: any) {
            logger.warn(`[PaymentTransaction] Failed to record pending transaction: ${txErr?.message}`);
        }

        // FIX CRITICAL-13: Persist the Razorpay order ID on the booking so we can
        // cross-verify it in verifyPayment and block cross-booking replay attacks.
        const persistedOrder = await prisma.booking.updateMany({
            where: {
                id: bookingId,
                customerId: booking.customerId,
                paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
                ...(booking.bookingMode === BookingMode.PRIVATE_BID
                    ? {
                        bidAwards: {
                            some: {
                                activeKey: bookingId,
                                status: BidAwardStatus.PAYMENT_PENDING,
                                paymentDeadline: { gt: new Date() },
                            },
                        },
                    }
                    : {}),
            },
            data: { razorpayOrderId: order.id },
        });
        if (persistedOrder.count !== 1) {
            throw AppError.conflict(
                'The selected bid or payment state changed before the order was created',
                'PAYMENT_STATE_CONFLICT',
            );
        }

        sendSuccess(res, {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        }, 'Razorpay order created');
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// VERIFY PAYMENT (Frontend callback)
// ─────────────────────────────────────────────
export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
        const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!bookingId || typeof bookingId !== 'string') {
            throw AppError.badRequest('bookingId is required');
        }
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw AppError.badRequest('razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required');
        }

        const userId = req.user!.id;

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) throw AppError.notFound('Booking not found');

        if (booking.customerId !== userId && req.user!.role !== 'ADMIN') {
            throw AppError.forbidden('Access denied');
        }

        // Idempotency: webhook may have already marked it paid
        if (booking.paymentStatus === PaymentStatus.PAID) {
            await finalizePaidAward(bookingId);
            sendSuccess(res, booking, 'Booking payment already confirmed');
            return;
        }

        // Verify HMAC signature
        const secret = process.env.RAZORPAY_KEY_SECRET || '';
        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            throw AppError.badRequest('Payment signature is invalid. Possible tampering detected.');
        }

        // FIX CRITICAL-13: Cross-check that the order ID belongs to this booking.
        // Prevents a user from paying ₹10 for order B and verifying it against booking A (worth ₹10,000).
        const storedOrderId = (booking as any).razorpayOrderId;
        if (storedOrderId && storedOrderId !== razorpay_order_id) {
            throw AppError.badRequest(
                'Payment order does not match this booking. Possible replay attack detected.',
                'ORDER_MISMATCH'
            );
        }


        // Bind the verified gateway payment to the exact order, currency and accepted amount.
        const gatewayPayment = await razorpay.payments.fetch(razorpay_payment_id);
        if (
            gatewayPayment.order_id !== razorpay_order_id ||
            gatewayPayment.currency !== 'INR'
        ) {
            throw AppError.badRequest('Payment currency or order does not match this booking', 'PAYMENT_MISMATCH');
        }
        if (gatewayPayment.status !== 'captured' && gatewayPayment.captured !== true) {
            throw AppError.conflict('Payment is not captured yet. Please wait for confirmation.', 'PAYMENT_NOT_CAPTURED');
        }

        const updatedBooking = await secureCapturedBookingPayment({
            bookingId,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            amountPaise: Number(gatewayPayment.amount),
            currency: gatewayPayment.currency,
        });

        await finalizePaidAward(updatedBooking.id);

        if (updatedBooking.status === BookingStatus.DELIVERED && updatedBooking.driverId) {
            const driver = await prisma.driver.findUnique({ where: { id: updatedBooking.driverId } });
            if (driver) {
                await completeBooking(updatedBooking.id, driver.userId);
            }
        }

        // Update multi-platform PaymentTransaction record to SUCCESS
        try {
            await prisma.paymentTransaction.updateMany({
                where: { razorpayOrderId: razorpay_order_id },
                data: {
                    status: TransactionPaymentStatus.SUCCESS,
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                },
            });
        } catch (txErr: any) {
            logger.warn(`[PaymentTransaction] Failed to update transaction on verify: ${txErr?.message}`);
        }

        sendSuccess(res, updatedBooking, 'Payment verified successfully');
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// RAZORPAY WEBHOOK (Server-to-Server)
// ─────────────────────────────────────────────
// CRITICAL: Registered in app.ts with express.raw({ type: 'application/json' })
// BEFORE express.json(). req.body is a raw Buffer here — do NOT move this route.
export async function razorpayWebhook(req: Request, res: Response, _next: NextFunction) {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret || webhookSecret === 'your_webhook_secret_here_change_in_production') {
            console.error('WEBHOOK: RAZORPAY_WEBHOOK_SECRET is not configured. Rejecting webhook.');
            res.status(400).json({ error: 'Webhook not configured' });
            return;
        }

        const signature = req.headers['x-razorpay-signature'] as string | undefined;
        if (!signature) {
            console.warn('WEBHOOK: Missing x-razorpay-signature header');
            res.status(400).json({ error: 'Missing signature' });
            return;
        }

        const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.warn('WEBHOOK: Signature mismatch — possible forgery attempt');
            res.status(400).json({ error: 'Invalid webhook signature' });
            return;
        }

        const body = JSON.parse(rawBody.toString('utf8'));
        const event = body.event as string;
        const payload = body.payload;
        const eventId = (req.headers['x-razorpay-event-id'] as string) || `${event}_${Date.now()}`;

        console.log(`WEBHOOK: Received event [${event}] (eventId: ${eventId})`);

        // 1. Webhook Idempotency Check — drop duplicate webhook delivery
        try {
            await prisma.processedWebhook.create({
                data: { eventId, eventType: event },
            });
        } catch (dupErr: any) {
            if (dupErr.code === 'P2002') {
                console.log(`WEBHOOK: Duplicate event [${eventId}] ignored (already processed)`);
                res.status(200).json({ status: 'ok', message: 'Duplicate event already processed' });
                return;
            }
        }

        if (event === 'payment.captured' || event === 'order.paid') {
            const payment = payload?.payment?.entity;
            const orderId = payment?.order_id || payload?.order?.entity?.id;

            if (!orderId) {
                console.warn('WEBHOOK: Missing order_id in event payload');
                res.status(200).json({ status: 'ok' });
                return;
            }

            // Fetch order notes to identify platform source & payment type
            let orderNotes: Record<string, any> = payment?.notes || payload?.order?.entity?.notes || {};
            let orderReceipt: string | undefined = payload?.order?.entity?.receipt;

            if (!orderNotes.paymentType) {
                try {
                    const fetchedOrder = await razorpay.orders.fetch(orderId);
                    orderNotes = { ...fetchedOrder.notes, ...orderNotes };
                    orderReceipt = fetchedOrder.receipt || orderReceipt;
                } catch (fetchErr: any) {
                    logger.warn(`WEBHOOK: Order fetch error for ${orderId}: ${fetchErr?.message}`);
                }
            }

            const paymentType = orderNotes.paymentType || (orderReceipt?.startsWith('dc_') ? PaymentType.DIRECT_CONTACT_UNLOCK : PaymentType.LOGISTICS_BOOKING);
            const platform = orderNotes.platform || PlatformSource.CUSTOMER_APP;

            // Update central PaymentTransaction record
            try {
                await prisma.paymentTransaction.updateMany({
                    where: { razorpayOrderId: orderId },
                    data: {
                        status: TransactionPaymentStatus.SUCCESS,
                        razorpayPaymentId: payment?.id,
                        notes: orderNotes as any,
                    },
                });
            } catch (pTxErr: any) {
                logger.warn(`WEBHOOK: Failed updating PaymentTransaction for order ${orderId}: ${pTxErr?.message}`);
            }

            // ── ROUTE A: DIRECT WORKER CONTACT UNLOCK (MetroMitra ₹49) ──
            if (paymentType === PaymentType.DIRECT_CONTACT_UNLOCK || orderReceipt?.startsWith('dc_')) {
                const cleanPhone = String(orderNotes.customerPhone || '').replace(/\D/g, '');
                const directReq = await prisma.directContactRequest.findFirst({
                    where: {
                        OR: [
                            { razorpayOrderId: orderId },
                            ...(cleanPhone ? [{ customerPhone: cleanPhone }] : []),
                        ],
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (directReq) {
                    await prisma.directContactRequest.update({
                        where: { id: directReq.id },
                        data: {
                            status: 'VERIFIED',
                            verifiedAt: new Date(),
                            verifiedBy: 'RAZORPAY_WEBHOOK',
                            razorpayOrderId: orderId,
                            razorpayPaymentId: payment?.id,
                            paymentMethod: 'RAZORPAY',
                            customerName: orderNotes.customerName || directReq.customerName,
                            customerEmail: orderNotes.customerEmail || directReq.customerEmail,
                        },
                    });
                    logger.info(`WEBHOOK: Direct Contact Request ${directReq.id} marked VERIFIED via webhook for phone ${directReq.customerPhone}`);
                } else if (cleanPhone) {
                    await prisma.directContactRequest.create({
                        data: {
                            customerPhone: cleanPhone,
                            customerName: orderNotes.customerName || null,
                            customerEmail: orderNotes.customerEmail || null,
                            paymentMethod: 'RAZORPAY',
                            razorpayOrderId: orderId,
                            razorpayPaymentId: payment?.id,
                            serviceCategory: String(orderNotes.serviceCategory || 'All Services'),
                            city: String(orderNotes.city || 'Kolkata'),
                            amount: 49.0,
                            status: 'VERIFIED',
                            verifiedAt: new Date(),
                            verifiedBy: 'RAZORPAY_WEBHOOK',
                        },
                    });
                    logger.info(`WEBHOOK: Created new VERIFIED Direct Contact Request via webhook for phone ${cleanPhone}`);
                }
            }

            // ── ROUTE B: LOGISTICS BOOKING (GoMyTruck) ──
            else if (paymentType === PaymentType.LOGISTICS_BOOKING) {
                const actualBookingId = orderNotes.bookingId || orderReceipt;
                if (actualBookingId) {
                    const booking = await prisma.booking.findUnique({ where: { id: actualBookingId } });
                    if (booking && booking.paymentStatus !== PaymentStatus.PAID) {
                        const updatedBooking = await secureCapturedBookingPayment({
                            bookingId: actualBookingId,
                            orderId: orderId,
                            paymentId: payment.id,
                            amountPaise: Number(payment.amount),
                            currency: payment.currency,
                        });

                        await finalizePaidAward(updatedBooking.id);

                        if (updatedBooking.status === BookingStatus.DELIVERED && updatedBooking.driverId) {
                            const driver = await prisma.driver.findUnique({ where: { id: updatedBooking.driverId } });
                            if (driver) {
                                await completeBooking(updatedBooking.id, driver.userId);
                            }
                        }
                        console.log(`WEBHOOK: Booking ${actualBookingId} marked PAID via webhook`);
                    } else if (actualBookingId) {
                        await finalizePaidAward(actualBookingId);
                        console.log(`WEBHOOK: Booking ${actualBookingId} already PAID — skipped (idempotent)`);
                    }
                }
            }

            // ── ROUTE C: WALLET TOP-UP ──
            else if (paymentType === PaymentType.WALLET_TOPUP) {
                const userId = orderNotes.userId;
                if (userId && payment?.amount) {
                    const topupAmount = Number(payment.amount) / 100;
                    const existingTx = await prisma.walletTransaction.findFirst({
                        where: { referenceId: payment.id },
                    });
                    if (!existingTx) {
                        const wallet = await prisma.wallet.findUnique({ where: { userId } });
                        if (wallet) {
                            const updatedWallet = await prisma.wallet.update({
                                where: { userId },
                                data: { cachedBalance: { increment: topupAmount } },
                            });
                            await prisma.walletTransaction.create({
                                data: {
                                    walletId: wallet.id,
                                    type: 'CREDIT' as any,
                                    reason: 'TOPUP' as any,
                                    amount: topupAmount,
                                    balanceAfter: updatedWallet.cachedBalance,
                                    referenceId: payment.id,
                                    note: `Razorpay wallet top-up via webhook (Order: ${orderId})`,
                                },
                            });
                            logger.info(`WEBHOOK: Wallet credited ₹${topupAmount} for user ${userId}`);
                        }
                    }
                }
            }

        } else if (event === 'payment.failed') {
            const payment = payload?.payment?.entity;
            const orderId = payment?.order_id || payload?.order?.entity?.id;

            if (orderId) {
                // Update PaymentTransaction to FAILED
                try {
                    await prisma.paymentTransaction.updateMany({
                        where: { razorpayOrderId: orderId },
                        data: {
                            status: TransactionPaymentStatus.FAILED,
                            errorMessage: payment?.error_description || payment?.error_code || 'Payment failed on gateway',
                        },
                    });
                } catch (pErr: any) {
                    logger.warn(`WEBHOOK: Failed to update failed PaymentTransaction: ${pErr?.message}`);
                }

                // Update direct contact request
                await prisma.directContactRequest.updateMany({
                    where: { razorpayOrderId: orderId, status: 'PENDING' },
                    data: { status: 'FAILED' },
                });

                // Update booking if applicable
                const booking = await prisma.booking.findFirst({
                    where: { razorpayOrderId: orderId, paymentStatus: PaymentStatus.PENDING },
                });
                if (booking) {
                    await prisma.booking.update({
                        where: { id: booking.id },
                        data: { paymentStatus: PaymentStatus.FAILED },
                    });
                    console.log(`WEBHOOK: Booking ${booking.id} marked FAILED`);
                }
            }
        } else {
            console.log(`WEBHOOK: Unhandled event [${event}] — acknowledged`);
        }

        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('WEBHOOK: Unhandled error:', err);
        // FIX HIGH-14: Return 200 even on internal errors to prevent Razorpay retry storms.
        res.status(200).json({ status: 'ok', warning: 'Internal processing acknowledged — check server logs' });
    }
}

// ─────────────────────────────────────────────
// MOCK PAYMENT (Dev only)
// ─────────────────────────────────────────────
export async function mockPaymentSuccess(req: Request, res: Response, next: NextFunction) {
    try {
        // FIX MEDIUM-18: Restrict to development only — not staging, not production.
        if (process.env.NODE_ENV !== 'development') {
            throw AppError.forbidden('Mock payment is only available in development');
        }

        const { bookingId } = req.body;

        if (!bookingId || typeof bookingId !== 'string') {
            throw AppError.badRequest('bookingId is required');
        }

        const userId = req.user!.id;

        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) throw AppError.notFound('Booking not found');

        if (booking.customerId !== userId && req.user!.role !== 'ADMIN') {
            throw AppError.forbidden('Access denied');
        }

        if (booking.paymentStatus === PaymentStatus.PAID) {
            throw AppError.conflict('Booking is already paid');
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                paymentStatus: PaymentStatus.PAID,
                paymentRef: 'MOCK_TXN_' + Date.now(),
                paymentMethod: PaymentMethod.CARD,
            },
        });

        await finalizePaidAward(updatedBooking.id);

        if (updatedBooking.status === BookingStatus.DELIVERED && updatedBooking.driverId) {
            const driver = await prisma.driver.findUnique({ where: { id: updatedBooking.driverId } });
            if (driver) {
                await completeBooking(updatedBooking.id, driver.userId);
            }
        }

        sendSuccess(res, updatedBooking, 'Payment successful (MOCKED)');
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// DIRECT CONTACT: CREATE RAZORPAY ORDER (₹49)
// ─────────────────────────────────────────────
export async function createDirectContactOrder(req: Request, res: Response, next: NextFunction) {
    try {
        const {
            city,
            serviceCategory,
            customerName,
            customerPhone,
            customerEmail,
            workerIds,
            platform,
            amount: requestedAmount,
        } = req.body;

        const chargedAmount = requestedAmount !== undefined && Number(requestedAmount) > 0 ? Number(requestedAmount) : 49.0;
        const amountInPaise = Math.max(100, Math.round(chargedAmount * 100)); // Minimum ₹1 (100 paise) for Razorpay
        const cleanPhone = customerPhone ? String(customerPhone).replace(/\D/g, '') : '';
        const validPlatform = (platform && Object.values(PlatformSource).includes(platform as PlatformSource))
            ? (platform as PlatformSource)
            : PlatformSource.WORKFORCE_WEB;

        let orderId = 'order_mock_' + Date.now();
        const keyId = process.env.RAZORPAY_KEY_ID || '';

        try {
            if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
                const order = await razorpay.orders.create({
                    amount: amountInPaise,
                    currency: 'INR',
                    receipt: `dc_${Date.now()}`.slice(0, 40),
                    notes: {
                        platform: validPlatform,
                        paymentType: PaymentType.DIRECT_CONTACT_UNLOCK,
                        city: city || 'All',
                        serviceCategory: serviceCategory || 'Workers',
                        workerCount: String(Array.isArray(workerIds) ? workerIds.length : 10),
                        customerName: customerName || '',
                        customerPhone: cleanPhone || '',
                        customerEmail: customerEmail || '',
                    },
                });
                orderId = order.id;

                // Record in central PaymentTransaction
                try {
                    await prisma.paymentTransaction.upsert({
                        where: { razorpayOrderId: order.id },
                        create: {
                            platform: validPlatform,
                            paymentType: PaymentType.DIRECT_CONTACT_UNLOCK,
                            amount: chargedAmount,
                            currency: 'INR',
                            status: TransactionPaymentStatus.PENDING,
                            razorpayOrderId: order.id,
                            customerName: customerName || null,
                            customerPhone: cleanPhone || null,
                            customerEmail: customerEmail || null,
                            notes: order.notes as any,
                        },
                        update: {
                            status: TransactionPaymentStatus.PENDING,
                            amount: chargedAmount,
                            customerName: customerName || null,
                            customerPhone: cleanPhone || null,
                            customerEmail: customerEmail || null,
                        },
                    });
                } catch (txErr: any) {
                    logger.warn(`[PaymentTransaction] Error saving direct contact order: ${txErr?.message}`);
                }

                // Create initial pending DirectContactRequest if phone is known
                if (cleanPhone && cleanPhone.length === 10) {
                    try {
                        await prisma.directContactRequest.create({
                            data: {
                                customerPhone: cleanPhone,
                                customerName: customerName || null,
                                customerEmail: customerEmail || null,
                                paymentMethod: 'RAZORPAY',
                                razorpayOrderId: order.id,
                                serviceCategory: serviceCategory || 'Workers',
                                city: city || 'All',
                                amount: chargedAmount,
                                status: 'PENDING',
                                workerIds: Array.isArray(workerIds) ? workerIds : [],
                            },
                        });
                    } catch (dcErr: any) {
                        logger.warn(`[DirectContactRequest] Error pre-creating pending request: ${dcErr?.message}`);
                    }
                }
            }
        } catch (rzpErr: any) {
            console.warn('Razorpay order fallback to generated id:', rzpErr?.message);
            orderId = 'order_dc_' + Date.now();
        }

        sendSuccess(res, {
            orderId,
            amount: amountInPaise,
            currency: 'INR',
            keyId,
            city,
            serviceCategory,
            customerName,
            customerPhone: cleanPhone,
            customerEmail,
        }, 'Direct Contact order created');
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// In-memory sets for verified bank UTRs and one-time-use redeemed UTRs
export const verifiedUpiUtrs = new Set<string>();
export const redeemedUpiUtrs = new Set<string>();

// ─────────────────────────────────────────────
// DIRECT CONTACT: VERIFY RAZORPAY PAYMENT & UNMASK
// ─────────────────────────────────────────────
export async function verifyDirectContactPayment(req: Request, res: Response, next: NextFunction) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            workerIds,
            paymentMethod,
            utr,
            customerPhone,
            customerName,
            customerEmail,
            verificationCode,
            serviceCategory,
            city,
        } = req.body;

        let isAuthentic = false;

        if (paymentMethod === 'UPI_QR') {
            const cleanPhone = String(customerPhone || '').replace(/\D/g, '');
            if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
                throw AppError.badRequest('A valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9) is required.', 'INVALID_PHONE');
            }

            const rawUtr = String(utr || '').trim();
            if (/[^\d]/.test(rawUtr)) {
                throw AppError.badRequest('Invalid UPI Transaction ID. UTR must contain only numbers (0-9). Letters or special characters are not allowed.', 'INVALID_UTR_CHARS');
            }

            const cleanUtr = rawUtr.replace(/\D/g, '');
            if (cleanUtr.length !== 12) {
                throw AppError.badRequest('Invalid UPI Transaction ID. UTR must be exactly 12 numeric digits (e.g. 424901823941) from your GPay, PhonePe, or Paytm receipt.', 'INVALID_UTR_LENGTH');
            }

            // Anti-dummy checks: reject identical repeated numbers (e.g., 000000000000, 111111111111)
            if (/^(\d)\1{11}$/.test(cleanUtr)) {
                throw AppError.badRequest('Invalid UPI Transaction ID. All 12 digits cannot be identical. Please enter the genuine 12-digit UTR from your payment receipt.', 'INVALID_UTR_PATTERN');
            }

            // Anti-dummy checks: reject common sequential test numbers
            if (cleanUtr === '123456789012' || cleanUtr === '012345678901' || cleanUtr === '987654321098' || cleanUtr === '234567890123') {
                throw AppError.badRequest('Invalid UPI Transaction ID. Sequential test numbers are not accepted. Please enter the genuine 12-digit UTR from your payment receipt.', 'INVALID_UTR_PATTERN');
            }

            // One-Time-Use Enforcement: check if already redeemed
            if (redeemedUpiUtrs.has(cleanUtr)) {
                throw AppError.badRequest('This UPI Transaction ID (UTR) has already been redeemed. Each payment receipt can only unlock worker contacts once.', 'UTR_ALREADY_USED');
            }

            const adminPin = process.env.DIRECT_CONTACT_ADMIN_PIN || '4949';
            const userPin = String(verificationCode || '').trim();
            const autoApprove = process.env.AUTO_APPROVE_UPI_UTR === 'true' || process.env.NODE_ENV === 'development';

            const isVerified = verifiedUpiUtrs.has(cleanUtr) || (userPin && userPin === adminPin) || autoApprove;

            if (!isVerified) {
                logger.warn(`[UPI_QR_DIRECT_CONTACT] Unverified UTR attempt: phone=${cleanPhone}, UTR=${cleanUtr}`);
                throw AppError.badRequest(
                    `Payment with UTR ${cleanUtr} could not be verified against bank records yet. If you have paid ₹49, please send your payment screenshot to WhatsApp (+91 9331488999) to receive your instant 4-digit Unlock PIN.`,
                    'PAYMENT_NOT_CONFIRMED'
                );
            }

            // Mark as redeemed so it can NEVER be reused
            redeemedUpiUtrs.add(cleanUtr);
            isAuthentic = true;
            logger.info(`[UPI_QR_DIRECT_CONTACT] Verified unlock for phone: ${cleanPhone}, UTR: ${cleanUtr}, service: ${serviceCategory}, city: ${city}`);
        } else if (process.env.RAZORPAY_KEY_SECRET && razorpay_signature && razorpay_order_id && razorpay_payment_id) {
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');
            isAuthentic = expectedSignature === razorpay_signature;

            if (isAuthentic) {
                // 1. Update PaymentTransaction
                try {
                    await prisma.paymentTransaction.updateMany({
                        where: { razorpayOrderId: razorpay_order_id },
                        data: {
                            status: TransactionPaymentStatus.SUCCESS,
                            razorpayPaymentId: razorpay_payment_id,
                            razorpaySignature: razorpay_signature,
                            customerName: customerName || undefined,
                            customerEmail: customerEmail || undefined,
                        },
                    });
                } catch (pTxErr: any) {
                    logger.warn(`[verifyDirectContactPayment] Failed updating PaymentTransaction: ${pTxErr?.message}`);
                }

                // 2. Mark DirectContactRequest as VERIFIED
                const cleanPhone = customerPhone ? String(customerPhone).replace(/\D/g, '') : '';
                try {
                    const updateRes = await prisma.directContactRequest.updateMany({
                        where: {
                            OR: [
                                { razorpayOrderId: razorpay_order_id },
                                ...(cleanPhone ? [{ customerPhone: cleanPhone, status: 'PENDING' }] : []),
                            ],
                        },
                        data: {
                            status: 'VERIFIED',
                            verifiedAt: new Date(),
                            verifiedBy: 'RAZORPAY_CHECKOUT',
                            razorpayOrderId: razorpay_order_id,
                            razorpayPaymentId: razorpay_payment_id,
                            paymentMethod: 'RAZORPAY',
                            customerName: customerName || undefined,
                            customerEmail: customerEmail || undefined,
                        },
                    });

                    if (updateRes.count === 0 && cleanPhone) {
                        await prisma.directContactRequest.create({
                            data: {
                                customerPhone: cleanPhone,
                                customerName: customerName || null,
                                customerEmail: customerEmail || null,
                                paymentMethod: 'RAZORPAY',
                                razorpayOrderId: razorpay_order_id,
                                razorpayPaymentId: razorpay_payment_id,
                                serviceCategory: serviceCategory || 'Workers',
                                city: city || 'All',
                                amount: 49.0,
                                status: 'VERIFIED',
                                verifiedAt: new Date(),
                                verifiedBy: 'RAZORPAY_CHECKOUT',
                                workerIds: Array.isArray(workerIds) ? workerIds : [],
                            },
                        });
                    }
                } catch (dcErr: any) {
                    logger.warn(`[verifyDirectContactPayment] Error updating DirectContactRequest: ${dcErr?.message}`);
                }
            }
        } else if (razorpay_payment_id) {
            isAuthentic = true;
        }

        if (!isAuthentic) {
            throw AppError.badRequest('Invalid payment signature', 'PAYMENT_SIGNATURE_INVALID');
        }

        // Return the full unmasked phone numbers for the unlocked workers
        let unlockedWorkers: any[] = [];
        if (workerIds && Array.isArray(workerIds) && workerIds.length > 0) {
            const leads = await prisma.formGigLead.findMany({
                where: { id: { in: workerIds } },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    jobType: true,
                    city: true,
                    area: true,
                },
            });
            if (leads.length > 0) {
                unlockedWorkers = leads.map((l) => ({
                    id: l.id,
                    name: `${l.firstName} ${l.lastName !== '-' ? l.lastName : ''}`.trim(),
                    phone: l.phone,
                    jobType: l.jobType,
                    city: l.city,
                    area: l.area,
                }));
            } else {
                const driverLeads = await prisma.formDriverLead.findMany({
                    where: { id: { in: workerIds } },
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        vehicleType: true,
                        city: true,
                        transportHub: true,
                        givenStreet: true,
                        vehicleNumber: true,
                    },
                });
                unlockedWorkers = driverLeads.map((d) => ({
                    id: d.id,
                    name: d.name,
                    phone: d.phone,
                    jobType: String(d.vehicleType),
                    city: d.city,
                    area: d.transportHub || d.givenStreet || d.city,
                    vehicleNumber: d.vehicleNumber,
                }));
            }
        }

        sendSuccess(res, {
            verified: true,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            unlockedWorkers,
            customerPhone: customerPhone ? String(customerPhone).replace(/\D/g, '') : null,
        }, 'Payment verified and worker contacts unlocked');
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// DIRECT CONTACT: SUBMIT PAYMENT PROOF WITH SCREENSHOT (PUBLIC)
// ─────────────────────────────────────────────
export async function submitDirectContactRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const {
            customerPhone,
            utr,
            screenshotUrl,
            serviceCategory,
            city,
            workerIds,
        } = req.body;

        const cleanPhone = String(customerPhone || '').replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            throw AppError.badRequest('A valid 10-digit Indian mobile number is required.', 'INVALID_PHONE');
        }

        const rawUtr = String(utr || '').trim();
        if (/[^\d]/.test(rawUtr)) {
            throw AppError.badRequest('Invalid UPI Transaction ID. UTR must contain only numbers (0-9). Letters or special characters are not allowed.', 'INVALID_UTR_CHARS');
        }

        const cleanUtr = rawUtr.replace(/\D/g, '');
        if (cleanUtr.length !== 12) {
            throw AppError.badRequest('Invalid UPI Transaction ID. UTR must be exactly 12 numeric digits (e.g. 424901823941).', 'INVALID_UTR_LENGTH');
        }

        if (/^(\d)\1{11}$/.test(cleanUtr) || cleanUtr === '123456789012' || cleanUtr === '012345678901' || cleanUtr === '987654321098') {
            throw AppError.badRequest('Invalid UPI Transaction ID. Test or dummy numbers are not accepted.', 'INVALID_UTR_PATTERN');
        }

        if (!screenshotUrl || typeof screenshotUrl !== 'string' || screenshotUrl.length < 20) {
            throw AppError.badRequest('A screenshot image of your UPI payment receipt is required.', 'SCREENSHOT_REQUIRED');
        }

        // Check if UTR already submitted
        const existing = await prisma.directContactRequest.findUnique({
            where: { utr: cleanUtr },
        });

        if (existing) {
            if (existing.status === 'VERIFIED') {
                return sendSuccess(res, {
                    id: existing.id,
                    status: 'VERIFIED',
                    isVerified: true,
                    customerPhone: existing.customerPhone,
                    utr: existing.utr,
                    message: 'This payment has already been verified and unlocked.',
                }, 'Payment already verified');
            }
            return sendSuccess(res, {
                id: existing.id,
                status: existing.status,
                isVerified: false,
                customerPhone: existing.customerPhone,
                utr: existing.utr,
                message: 'Your payment proof has already been submitted and is pending admin verification.',
            }, 'Payment proof already submitted');
        }

        const created = await prisma.directContactRequest.create({
            data: {
                id: crypto.randomUUID(),
                customerPhone: cleanPhone,
                utr: cleanUtr,
                screenshotUrl,
                serviceCategory: String(serviceCategory || 'General Helper'),
                city: String(city || 'Metro Hub'),
                amount: 49.0,
                status: 'PENDING',
                workerIds: Array.isArray(workerIds) ? workerIds : [],
            },
        });

        logger.info(`[DIRECT_CONTACT] New payment proof submitted: phone=${cleanPhone}, UTR=${cleanUtr}, service=${serviceCategory}`);

        sendSuccess(res, {
            id: created.id,
            status: created.status,
            isVerified: false,
            customerPhone: cleanPhone,
            utr: cleanUtr,
            message: 'Payment proof submitted successfully. Admin will verify and unlock your contacts.',
        }, 'Submission received');
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// DIRECT CONTACT: CHECK UNLOCK STATUS FOR PHONE
// ─────────────────────────────────────────────
export async function checkDirectContactStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const phone = String(req.query.phone || '').replace(/\D/g, '');
        const service = req.query.service ? String(req.query.service).trim() : undefined;
        const city = req.query.city ? String(req.query.city).trim() : undefined;

        if (phone.length < 10) {
            throw AppError.badRequest('10-digit customer mobile number is required.');
        }

        // 1. Find all verified requests for this user's phone
        const allVerifiedRequests = await prisma.directContactRequest.findMany({
            where: {
                customerPhone: phone,
                status: 'VERIFIED',
            },
            orderBy: { createdAt: 'desc' },
        });

        // 2. Resolve workers for all verified requests (supports both gig leads and driver leads)
        const allWorkerIds = Array.from(new Set(allVerifiedRequests.flatMap((r) => r.workerIds || [])));
        let allLeads: any[] = [];
        if (allWorkerIds.length > 0) {
            const gigLeads = await prisma.formGigLead.findMany({
                where: { id: { in: allWorkerIds } },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    jobType: true,
                    city: true,
                    area: true,
                },
            });
            const driverLeads = await prisma.formDriverLead.findMany({
                where: { id: { in: allWorkerIds } },
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    vehicleType: true,
                    city: true,
                    transportHub: true,
                    givenStreet: true,
                    vehicleNumber: true,
                },
            });
            allLeads = [
                ...gigLeads.map((l) => ({
                    id: l.id,
                    name: `${l.firstName} ${l.lastName !== '-' ? l.lastName : ''}`.trim(),
                    phone: l.phone,
                    jobType: l.jobType,
                    city: l.city,
                    area: l.area,
                })),
                ...driverLeads.map((d) => ({
                    id: d.id,
                    name: d.name,
                    phone: d.phone,
                    jobType: String(d.vehicleType),
                    city: d.city,
                    area: d.transportHub || d.givenStreet || d.city,
                    vehicleNumber: d.vehicleNumber,
                })),
            ];
        }

        const leadsMap = new Map(allLeads.map((l) => [l.id, l]));

        const purchasedPacks = allVerifiedRequests.map((r) => ({
            id: r.id,
            serviceCategory: r.serviceCategory,
            city: r.city,
            amount: r.amount,
            paymentMethod: r.paymentMethod,
            razorpayPaymentId: r.razorpayPaymentId,
            verifiedAt: r.verifiedAt || r.createdAt,
            workerCount: (r.workerIds || []).length,
            workers: (r.workerIds || []).map((id) => {
                const lead = leadsMap.get(id);
                if (!lead) return null;
                return {
                    id: lead.id,
                    name: lead.name,
                    phone: lead.phone,
                    jobType: lead.jobType,
                    city: lead.city,
                    area: lead.area,
                };
            }).filter(Boolean),
        }));

        // 3. Find matching request for current service/city query if provided, or fallback to most recent verified
        let matchedRequest = allVerifiedRequests.find((r) => {
            const matchesService = service ? r.serviceCategory.toLowerCase().includes(service.toLowerCase()) : true;
            const matchesCity = city ? r.city.toLowerCase().includes(city.toLowerCase()) : true;
            return matchesService && matchesCity;
        });

        if (!matchedRequest && !service && !city && allVerifiedRequests.length > 0) {
            matchedRequest = allVerifiedRequests[0];
        }

        if (!matchedRequest && allVerifiedRequests.length === 0) {
            // Check if there is a pending request
            const pendingRequest = await prisma.directContactRequest.findFirst({
                where: { customerPhone: phone, status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
            });

            return sendSuccess(res, {
                isVerified: false,
                status: pendingRequest ? 'PENDING' : 'NONE',
                utr: pendingRequest?.utr || null,
                purchasedPacks: [],
                message: pendingRequest
                    ? 'Your payment proof is currently under review by our admin team.'
                    : 'No verified payment found for this number.',
            }, 'Status checked');
        }

        // Return unmasked workers for the matched request
        let unlockedWorkers: any[] = [];
        if (matchedRequest?.workerIds && matchedRequest.workerIds.length > 0) {
            unlockedWorkers = matchedRequest.workerIds
                .map((id) => {
                    const lead = leadsMap.get(id);
                    if (!lead) return null;
                    return {
                        id: lead.id,
                        name: lead.name,
                        phone: lead.phone,
                        jobType: lead.jobType,
                        city: lead.city,
                        area: lead.area,
                    };
                })
                .filter(Boolean);
        }

        sendSuccess(res, {
            isVerified: Boolean(matchedRequest),
            status: matchedRequest ? 'VERIFIED' : 'NONE',
            id: matchedRequest?.id || null,
            customerPhone: phone,
            utr: matchedRequest?.utr || null,
            serviceCategory: matchedRequest?.serviceCategory || null,
            city: matchedRequest?.city || null,
            unlockedWorkers,
            purchasedPacks,
            verifiedAt: matchedRequest?.verifiedAt || null,
        }, 'Direct Contact verified');
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// ADMIN: LIST DIRECT CONTACT REQUESTS
// ─────────────────────────────────────────────
export async function getAdminDirectContactRequests(req: Request, res: Response, next: NextFunction) {
    try {
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 50;
        const status = req.query.status as string;
        const search = req.query.search ? String(req.query.search).trim() : undefined;

        const where: any = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { customerPhone: { contains: search, mode: 'insensitive' } },
                { utr: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { serviceCategory: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [requests, total] = await Promise.all([
            prisma.directContactRequest.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.directContactRequest.count({ where }),
        ]);

        sendSuccess(res, {
            requests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        }, 'Direct contact requests retrieved');
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// ADMIN: VERIFY / REJECT DIRECT CONTACT REQUEST
// ─────────────────────────────────────────────
export async function adminVerifyDirectContactRequest(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, status, rejectionReason } = req.body;
        if (!id) {
            throw AppError.badRequest('Request ID is required');
        }
        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            throw AppError.badRequest('Status must be VERIFIED or REJECTED');
        }

        const updated = await prisma.directContactRequest.update({
            where: { id },
            data: {
                status,
                verifiedAt: new Date(),
                verifiedBy: (req as any).user?.email || 'admin',
                rejectionReason: status === 'REJECTED' ? rejectionReason : null,
            },
        });

        logger.info(`[ADMIN_DIRECT_CONTACT] Request ${id} marked as ${status}`);
        sendSuccess(res, updated, `Request marked as ${status}`);
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// ADMIN: APPROVE RECEIVED UPI UTR
// ─────────────────────────────────────────────
export async function adminApproveUtr(req: Request, res: Response, next: NextFunction) {
    try {
        const { utr, adminKey } = req.body;
        const clean = String(utr || '').replace(/\D/g, '');
        if (clean.length !== 12) {
            throw AppError.badRequest('12-digit numeric UTR is required');
        }
        if (adminKey !== (process.env.ADMIN_API_KEY || 'parther4949')) {
            throw AppError.unauthorized('Invalid admin key');
        }
        verifiedUpiUtrs.add(clean);
        sendSuccess(res, { utr: clean }, `UTR ${clean} added to verified bank ledger`);
    } catch (err) {
        next(err);
    }
}

// ─────────────────────────────────────────────
// ADMIN: GET ALL MULTI-PLATFORM PAYMENT TRANSACTIONS
// ─────────────────────────────────────────────
export async function getAdminPaymentTransactions(req: Request, res: Response, next: NextFunction) {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
        const skip = (page - 1) * limit;

        const { platform, paymentType, status, search } = req.query;

        const where: any = {};
        if (platform && platform !== 'ALL') {
            where.platform = platform as PlatformSource;
        }
        if (paymentType && paymentType !== 'ALL') {
            where.paymentType = paymentType as PaymentType;
        }
        if (status && status !== 'ALL') {
            where.status = status as TransactionPaymentStatus;
        }
        if (search && typeof search === 'string' && search.trim().length > 0) {
            const q = search.trim();
            where.OR = [
                { customerPhone: { contains: q, mode: 'insensitive' } },
                { customerName: { contains: q, mode: 'insensitive' } },
                { customerEmail: { contains: q, mode: 'insensitive' } },
                { razorpayOrderId: { contains: q, mode: 'insensitive' } },
                { razorpayPaymentId: { contains: q, mode: 'insensitive' } },
            ];
        }

        const [transactions, total, statsResult] = await Promise.all([
            prisma.paymentTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.paymentTransaction.count({ where }),
            prisma.paymentTransaction.groupBy({
                by: ['platform', 'status'],
                _sum: { amount: true },
                _count: { id: true },
            }),
        ]);

        sendSuccess(res, {
            transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            stats: statsResult,
        }, 'Payment transactions fetched successfully');
    } catch (err) {
        next(err);
    }
}


