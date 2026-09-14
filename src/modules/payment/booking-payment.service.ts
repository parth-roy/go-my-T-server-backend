import {
  BidAwardStatus,
  BookingMode,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';

interface CapturedPaymentInput {
  bookingId: string;
  orderId: string;
  paymentId: string;
  amountPaise: number;
  currency: string;
}

export async function secureCapturedBookingPayment(input: CapturedPaymentInput) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) throw AppError.notFound('Booking not found');
    if (booking.razorpayOrderId !== input.orderId) {
      throw AppError.badRequest(
        'Payment order does not match this booking. Possible replay attack detected.',
        'ORDER_MISMATCH',
      );
    }
    if (booking.paymentStatus === PaymentStatus.PAID) return booking;
    if (booking.paymentStatus === PaymentStatus.REFUNDED) {
      throw AppError.conflict('This booking payment was already refunded', 'PAYMENT_REFUNDED');
    }

    let expectedAmountPaise = Math.round((booking.grandTotal ?? booking.totalFare ?? 0) * 100);
    if (booking.bookingMode === BookingMode.PRIVATE_BID) {
      const award = await tx.bidAward.findFirst({
        where: {
          bookingId: booking.id,
          activeKey: booking.id,
          status: {
            in: [BidAwardStatus.PAYMENT_PENDING, BidAwardStatus.PAYMENT_RECONCILING],
          },
        },
      });
      if (!award) {
        throw AppError.conflict(
          'This bid award is no longer active; the captured payment requires reconciliation',
          'BID_AWARD_NOT_ACTIVE',
        );
      }
      expectedAmountPaise = Math.round(Number(award.customerTotal) * 100);
    }

    // ─────────────────────────────────────────────
    // PRODUCTION TEST TOGGLE: Force ₹1.00 payment
    // Must match the toggle in payment.controller.ts createOrder().
    // Set to false to restore real fare amount verification.
    // ─────────────────────────────────────────────
    const FORCE_PRODUCTION_TEST_ONE_RUPEE = true;
    const effectiveExpectedPaise = FORCE_PRODUCTION_TEST_ONE_RUPEE ? 100 : expectedAmountPaise;

    if (input.amountPaise !== effectiveExpectedPaise || input.currency !== 'INR') {
      throw AppError.badRequest(
        'Payment amount, currency or order does not match this booking',
        'PAYMENT_MISMATCH',
      );
    }

    const secured = await tx.booking.updateMany({
      where: {
        id: booking.id,
        razorpayOrderId: input.orderId,
        paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
      },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentRef: input.paymentId,
        paymentMethod: PaymentMethod.CARD,
      },
    });
    if (secured.count !== 1) {
      throw AppError.conflict('Payment state changed during confirmation', 'PAYMENT_STATE_CONFLICT');
    }
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
