import { prisma } from '@shared/db/prisma';
import { finalizePaidAward } from '@modules/marketplace/marketplace.service';
import {
    BidAwardStatus,
    BookingMode,
    PaymentMethod,
    PaymentStatus,
    PaymentType,
    Prisma,
    PrismaClient,
    WalletTransactionReason,
    WalletTransactionType,
} from '@prisma/client';
import { AppError } from '@shared/errors/AppError';
import { razorpay } from '@modules/payment/razorpay.client';
import crypto from 'crypto';

// ─────────────────────────────────────────────
// GET WALLET (with summary)
// ─────────────────────────────────────────────

export async function getWallet(userId: string) {
    let wallet = await prisma.wallet.findUnique({
        where: { userId },
        include: {
            transactions: {
                orderBy: { createdAt: 'desc' },
                take: 20,
            }
        }
    });

    if (!wallet) {
        wallet = await prisma.wallet.create({
            data: { userId, cachedBalance: 0 },
            include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
        });
    }

    return wallet;
}

// ─────────────────────────────────────────────
// GET WALLET TRANSACTION HISTORY (paginated)
// ─────────────────────────────────────────────

export async function getTransactionHistory(userId: string, page: number, limit: number) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
        return { transactions: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await prisma.$transaction([
        prisma.walletTransaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
        transactions,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

// ─────────────────────────────────────────────
// ADD MONEY (direct, used by admin or legacy)
// ─────────────────────────────────────────────

export async function addMoney(userId: string, amount: number, referenceId?: string, adminActorId?: string) {
    if (amount <= 0) {
        throw AppError.badRequest('Amount must be greater than zero');
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw AppError.notFound('Wallet not found');

    const effectiveRefId = referenceId || (adminActorId ? `ADMIN_CREDIT_${adminActorId}` : 'ADMIN_MANUAL_CREDIT');

    return prisma.$transaction(async (tx) => {
        // FIN-004: Atomic increment prevents lost updates under concurrent credits
        const updatedWallet = await tx.wallet.update({
            where: { userId },
            data: { cachedBalance: { increment: amount } },
        });

        const transaction = await tx.walletTransaction.create({
            data: {
                walletId: updatedWallet.id,
                type: WalletTransactionType.CREDIT,
                reason: WalletTransactionReason.ADMIN_CREDIT,
                amount,
                balanceAfter: updatedWallet.cachedBalance,
                referenceId: effectiveRefId,
            },
        });

        return { wallet: updatedWallet, transaction };
    });
}

// ─────────────────────────────────────────────
// DEDUCT MONEY (internal utility)
// ─────────────────────────────────────────────

export async function deductMoney(userId: string, amount: number, reason: WalletTransactionReason, referenceId?: string) {
    if (amount <= 0) {
        throw AppError.badRequest('Amount must be greater than zero');
    }

    return prisma.$transaction(async (tx) => {
        // FIN-004: Atomic conditional decrement prevents race conditions and overdraft
        const deductResult = await tx.wallet.updateMany({
            where: { userId, cachedBalance: { gte: amount } },
            data: { cachedBalance: { decrement: amount } },
        });

        if (deductResult.count === 0) {
            const currentWallet = await tx.wallet.findUnique({ where: { userId } });
            if (!currentWallet) {
                throw AppError.notFound('Wallet not found');
            }
            throw AppError.badRequest(
                `Insufficient wallet balance. Required: ₹${amount.toFixed(2)}, Available: ₹${currentWallet.cachedBalance.toFixed(2)}`,
                'INSUFFICIENT_BALANCE'
            );
        }

        const updatedWallet = await tx.wallet.findUnique({ where: { userId } });
        if (!updatedWallet) throw AppError.notFound('Wallet not found');

        const transaction = await tx.walletTransaction.create({
            data: {
                walletId: updatedWallet.id,
                type: WalletTransactionType.DEBIT,
                reason,
                amount,
                balanceAfter: updatedWallet.cachedBalance,
                referenceId,
            },
        });

        return { wallet: updatedWallet, transaction };
    });
}

// ─────────────────────────────────────────────
// PAY FOR BOOKING VIA WALLET
// Atomically deducts balance and marks booking PAID
// ─────────────────────────────────────────────

export async function payForBooking(userId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw AppError.notFound('Booking not found');

    if (booking.customerId !== userId) {
        throw AppError.forbidden('You do not have access to this booking');
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
        throw AppError.conflict('Booking is already paid');
    }

    const amount = booking.grandTotal ?? booking.totalFare;
    if (!amount || amount <= 0) {
        throw AppError.badRequest('Booking has no valid fare. Cannot pay via wallet.');
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw AppError.notFound('Wallet not found. Please add money to your wallet first.');

    if (wallet.cachedBalance < amount) {
        throw AppError.badRequest(
            `Insufficient wallet balance. Required: ₹${amount.toFixed(2)}, Available: ₹${wallet.cachedBalance.toFixed(2)}`,
            'INSUFFICIENT_BALANCE'
        );
    }

    // FIX CRITICAL-12: Atomic conditional decrement prevents double-spend race condition.
    // The WHERE clause enforces cachedBalance >= amount inside the transaction.
    // If two concurrent requests race, only one gets count=1; the other throws.
    const updatedBooking = await prisma.$transaction(async (tx) => {
        const currentBooking = await tx.booking.findUnique({ where: { id: bookingId } });
        if (!currentBooking || currentBooking.customerId !== userId) {
            throw AppError.forbidden('You do not have access to this booking');
        }
        if (
            currentBooking.paymentStatus !== PaymentStatus.PENDING &&
            currentBooking.paymentStatus !== PaymentStatus.FAILED
        ) {
            throw AppError.conflict('Booking payment state changed before wallet debit', 'PAYMENT_STATE_CONFLICT');
        }
        if (currentBooking.bookingMode === BookingMode.PRIVATE_BID) {
            const award = await tx.bidAward.findFirst({
                where: {
                    bookingId,
                    customerId: userId,
                    activeKey: bookingId,
                    status: BidAwardStatus.PAYMENT_PENDING,
                    paymentDeadline: { gt: new Date() },
                },
            });
            if (!award || Math.round(Number(award.customerTotal) * 100) !== Math.round(amount * 100)) {
                throw AppError.conflict('The selected bid or its payment window is no longer active', 'BID_AWARD_NOT_ACTIVE');
            }
        }

        const deductResult = await tx.wallet.updateMany({
            where: { userId, cachedBalance: { gte: amount } },
            data: { cachedBalance: { decrement: amount } },
        });

        if (deductResult.count === 0) {
            throw AppError.badRequest(
                'Insufficient wallet balance',
                'INSUFFICIENT_BALANCE'
            );
        }

        const updatedWallet = await tx.wallet.findUnique({ where: { userId } });
        const newBalance = updatedWallet!.cachedBalance;

        const paidResult = await tx.booking.updateMany({
            where: {
                id: bookingId,
                paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
            },
            data: {
                paymentStatus: PaymentStatus.PAID,
                paymentRef: `WALLET_${Date.now()}`,
                paymentMethod: PaymentMethod.WALLET,
            },
        });
        if (paidResult.count !== 1) {
            throw AppError.conflict('Booking payment state changed during wallet debit', 'PAYMENT_STATE_CONFLICT');
        }

        await tx.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type: WalletTransactionType.DEBIT,
                reason: WalletTransactionReason.BOOKING_PAYMENT,
                amount,
                balanceAfter: newBalance,
                referenceId: bookingId,
                note: `Payment for booking #${booking.bookingNumber}`,
            },
        });

        return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await finalizePaidAward(bookingId);
    return updatedBooking;
}

// ─────────────────────────────────────────────
// WALLET TOP-UP: CREATE RAZORPAY ORDER
// ─────────────────────────────────────────────

export async function createTopUpOrder(userId: string, amount: number) {
    if (!amount || amount < 1) {
        throw AppError.badRequest('Minimum top-up amount is ₹1');
    }
    if (amount > 100000) {
        throw AppError.badRequest('Maximum top-up amount is ₹1,00,000');
    }

    const amountInPaise = Math.round(amount * 100);

    // Ensure wallet exists
    let wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
        wallet = await prisma.wallet.create({ data: { userId, cachedBalance: 0 } });
    }

    const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `W_${userId.slice(0, 8)}_${Date.now()}`,
        notes: {
            userId,
            purpose: 'WALLET_TOPUP',
            paymentType: PaymentType.WALLET_TOPUP,
        },
    });

    return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
    };
}

// ─────────────────────────────────────────────
// WALLET TOP-UP: VERIFY & CREDIT
// ─────────────────────────────────────────────

export async function verifyTopUp(
    userId: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
) {
    if (!process.env.RAZORPAY_KEY_SECRET) {
        throw AppError.internal('Payment gateway is not configured');
    }

    // Validate all fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw AppError.badRequest('razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required');
    }

    // Verify HMAC signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    if (generatedSignature !== razorpay_signature) {
        throw AppError.badRequest('Payment signature is invalid. Possible tampering detected.');
    }

    // Fetch order from Razorpay to get the actual amount paid and verify ownership
    const order = await razorpay.orders.fetch(razorpay_order_id) as any;
    if (order.notes?.userId && order.notes.userId !== userId) {
        throw AppError.forbidden('Payment order belongs to another account');
    }
    if (order.notes?.purpose && order.notes.purpose !== 'WALLET_TOPUP') {
        throw AppError.badRequest('Payment order was not created for wallet top-up');
    }

    // Fetch payment from Razorpay to verify capture status and order association
    const payment = await razorpay.payments.fetch(razorpay_payment_id) as any;
    if (payment.order_id !== razorpay_order_id) {
        throw AppError.badRequest('Payment ID does not match the provided order ID');
    }
    if (payment.status !== 'captured') {
        throw AppError.badRequest('Payment has not been captured successfully');
    }

    // Strict amount check: Only credit what was actually captured, never fall back to order.amount
    const amountPaidPaise = Number(order.amount_paid);
    if (!amountPaidPaise || amountPaidPaise <= 0 || order.status !== 'paid') {
        throw AppError.badRequest('Order has not been fully paid or verified');
    }
    const creditAmount = amountPaidPaise / 100;

    if (creditAmount <= 0) {
        throw AppError.badRequest('Invalid payment amount');
    }

    return prisma.$transaction(async (tx) => {
        // FIN-004: In-transaction idempotency prevents duplicate top-up credits under concurrent webhooks
        const existing = await tx.walletTransaction.findFirst({
            where: { referenceId: razorpay_payment_id },
        });
        if (existing) {
            const currentWallet = await tx.wallet.findUnique({ where: { userId } });
            return { message: 'Already credited', wallet: currentWallet, amountCredited: existing.amount };
        }

        let wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            wallet = await tx.wallet.create({ data: { userId, cachedBalance: 0 } });
        }

        const updatedWallet = await tx.wallet.update({
            where: { userId },
            data: { cachedBalance: { increment: creditAmount } },
        });

        const transaction = await tx.walletTransaction.create({
            data: {
                walletId: updatedWallet.id,
                type: WalletTransactionType.CREDIT,
                reason: WalletTransactionReason.TOP_UP,
                amount: creditAmount,
                balanceAfter: updatedWallet.cachedBalance,
                referenceId: razorpay_payment_id,
                note: `Wallet top-up via Razorpay`,
            },
        });

        return { message: 'Wallet topped up successfully', wallet: updatedWallet, amountCredited: creditAmount, transaction };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// REFUND — credited when an online-paid booking is cancelled
// ─────────────────────────────────────────────────────────────────────────────
export async function refundToWallet(userId: string, bookingId: string, amount: number) {
    if (amount <= 0) throw AppError.badRequest('Refund amount must be positive');

    return prisma.$transaction(async (tx) => {
        // FIN-004: In-transaction idempotency prevents duplicate refunds for the same cancelled booking
        const referenceId = `REFUND_${bookingId}`;
        const existingRefund = await tx.walletTransaction.findFirst({
            where: {
                referenceId,
                reason: WalletTransactionReason.REFUND,
            },
        });
        if (existingRefund) {
            const currentWallet = await tx.wallet.findUnique({ where: { userId } });
            return { message: 'Already refunded', wallet: currentWallet, refundAmount: amount };
        }

        let wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            wallet = await tx.wallet.create({ data: { userId, cachedBalance: 0 } });
        }

        const updatedWallet = await tx.wallet.update({
            where: { userId },
            data: { cachedBalance: { increment: amount } },
        });

        const transaction = await tx.walletTransaction.create({
            data: {
                walletId: updatedWallet.id,
                type: WalletTransactionType.CREDIT,
                reason: WalletTransactionReason.REFUND,
                amount,
                balanceAfter: updatedWallet.cachedBalance,
                referenceId,
                note: `Refund for cancelled booking`,
            },
        });

        return { message: 'Refund credited to wallet', wallet: updatedWallet, refundAmount: amount, transaction };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// CASHBACK — credited for rewards, promotions, referrals
// ─────────────────────────────────────────────────────────────────────────────
export async function creditCashback(userId: string, amount: number, referenceId: string, note?: string) {
    if (amount <= 0) return;

    return prisma.$transaction(async (tx) => {
        // FIN-004: In-transaction idempotency prevents duplicate reward credits
        const existing = await tx.walletTransaction.findFirst({
            where: { referenceId, reason: WalletTransactionReason.CASHBACK },
        });
        if (existing) return;

        let wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            wallet = await tx.wallet.create({ data: { userId, cachedBalance: 0 } });
        }

        const updatedWallet = await tx.wallet.update({
            where: { userId },
            data: { cachedBalance: { increment: amount } },
        });

        await tx.walletTransaction.create({
            data: {
                walletId: updatedWallet.id,
                type: WalletTransactionType.CREDIT,
                reason: WalletTransactionReason.CASHBACK,
                amount,
                balanceAfter: updatedWallet.cachedBalance,
                referenceId,
                note: note ?? `Cashback credited`,
            },
        });
    });
}
