const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Modules under test
const { completeBooking } = require('../dist/modules/booking/booking.service');
const { settleTripEarnings } = require('../dist/modules/driver-wallet/driver-wallet.service');
const { addMoney, deductMoney, verifyTopUp, refundToWallet, creditCashback } = require('../dist/modules/wallet/wallet.service');
const { prisma } = require('../dist/shared/db/prisma');
const { BookingStatus, DriverStatus, PaymentMethod, PaymentStatus, WalletTransactionType, WalletTransactionReason } = require('@prisma/client');

// ─────────────────────────────────────────────────────────────────────────────
// FIN-003: TRIP COMPLETION & SETTLEMENT RECOVERABILITY
// ─────────────────────────────────────────────────────────────────────────────

test('FIN-003: completeBooking rejects unpaid online bookings (PAYMENT_REQUIRED)', async () => {
  const originalBookingFindFirst = prisma.booking.findFirst;
  const originalDriverFind = prisma.driver.findUnique;

  try {
    // Mock booking that is ONLINE but paymentStatus is PENDING
    prisma.booking.findFirst = async () => ({
      id: 'booking-unpaid-online',
      customerId: 'cust-1',
      driverId: 'driver-1',
      status: BookingStatus.DELIVERED,
      paymentMethod: PaymentMethod.UPI,
      paymentStatus: PaymentStatus.PENDING,
      grandTotal: 1200,
    });

    prisma.driver.findUnique = async () => ({
      id: 'driver-1',
      userId: 'driver-user-1',
      status: DriverStatus.ON_TRIP,
    });

    await assert.rejects(
      async () => {
        await completeBooking('booking-unpaid-online', 'driver-user-1');
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'PAYMENT_REQUIRED');
        assert.match(err.message, /Online payment has not been received or confirmed/);
        return true;
      },
      'Unpaid online trip completion must be rejected with PAYMENT_REQUIRED'
    );
  } finally {
    prisma.booking.findFirst = originalBookingFindFirst;
    prisma.driver.findUnique = originalDriverFind;
  }
});

test('FIN-003: completeBooking uses atomic conditional state claim to prevent duplicate completion races', async () => {
  const originalBookingFindFirst = prisma.booking.findFirst;
  const originalDriverFind = prisma.driver.findUnique;
  const originalTransaction = prisma.$transaction;

  try {
    prisma.booking.findFirst = async () => ({
      id: 'booking-comp-race',
      customerId: 'cust-1',
      driverId: 'driver-1',
      status: BookingStatus.DELIVERED,
      paymentMethod: PaymentMethod.CASH,
      paymentStatus: PaymentStatus.PENDING,
      grandTotal: 500,
    });

    prisma.driver.findUnique = async () => ({
      id: 'driver-1',
      userId: 'driver-user-1',
      status: DriverStatus.ON_TRIP,
    });

    // Simulate concurrent thread where another caller already claimed COMPLETED (count = 0)
    prisma.$transaction = async (cb) => {
      const mockTx = {
        booking: {
          updateMany: async () => ({ count: 0 }), // 0 rows updated! Already claimed!
          findUnique: async () => null,
        },
        driver: {
          updateMany: async () => ({ count: 0 }),
        },
      };
      return cb(mockTx);
    };

    await assert.rejects(
      async () => {
        await completeBooking('booking-comp-race', 'driver-user-1');
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'INVALID_TRANSITION');
        assert.match(err.message, /Booking is already completed or not in a deliverable state/);
        return true;
      },
      'Concurrent completion attempt on already-completed booking must be rejected with 409'
    );
  } finally {
    prisma.booking.findFirst = originalBookingFindFirst;
    prisma.driver.findUnique = originalDriverFind;
    prisma.$transaction = originalTransaction;
  }
});

test('FIN-003: Repeated settlement call for an already-settled booking is idempotent and touches NO wallets', async () => {
  const originalDriverEarningFind = prisma.driverEarning.findUnique;
  const originalDriverEarningCreate = prisma.driverEarning.create;
  const originalDriverWalletFind = prisma.driverWallet.findUnique;
  const originalDriverWalletUpsert = prisma.driverWallet.upsert;
  const originalFleetWalletUpsert = prisma.fleetWallet.upsert;
  const originalTransaction = prisma.$transaction;

  let walletMutationCount = 0;
  let driverEarningCreatedCount = 0;

  try {
    prisma.$transaction = async (cb) => cb(prisma);

    // Existing settlement record found!
    prisma.driverEarning.findUnique = async ({ where }) => ({
      id: 'earning-existing-1',
      bookingId: where.bookingId,
      grossAmount: 1000,
      commission: 200,
      netAmount: 800,
    });

    prisma.driverEarning.create = async () => {
      driverEarningCreatedCount++;
    };

    prisma.driverWallet.upsert = async () => {
      walletMutationCount++;
    };

    prisma.fleetWallet.upsert = async () => {
      walletMutationCount++;
    };

    const result = await settleTripEarnings({
      bookingId: 'booking-already-settled',
      driverId: 'driver-1',
      grossAmount: 1000,
      paymentMethod: PaymentMethod.UPI,
    });

    assert.equal(result.type, 'ALREADY_SETTLED');
    assert.equal(result.driverNet, 800);
    assert.equal(result.commission, 200);

    // CRITICAL: Absolutely zero wallet modifications or new earnings on duplicate settlement!
    assert.equal(walletMutationCount, 0, 'No wallet balance mutations permitted on repeated settlement');
    assert.equal(driverEarningCreatedCount, 0, 'No duplicate earning record may be created');
  } finally {
    prisma.driverEarning.findUnique = originalDriverEarningFind;
    prisma.driverEarning.create = originalDriverEarningCreate;
    prisma.driverWallet.findUnique = originalDriverWalletFind;
    prisma.driverWallet.upsert = originalDriverWalletUpsert;
    prisma.fleetWallet.upsert = originalFleetWalletUpsert;
    prisma.$transaction = originalTransaction;
  }
});

test('FIN-003: settleTripEarnings rejects unpaid online bookings (PAYMENT_REQUIRED)', async () => {
  const originalDriverEarningFind = prisma.driverEarning.findUnique;
  const originalBookingFind = prisma.booking.findUnique;
  const originalTransaction = prisma.$transaction;

  try {
    prisma.$transaction = async (cb) => cb(prisma);

    prisma.driverEarning.findUnique = async () => null; // Not yet settled
    prisma.booking.findUnique = async () => ({
      id: 'booking-unpaid-settle',
      paymentStatus: PaymentStatus.PENDING, // Not PAID!
    });

    await assert.rejects(
      async () => {
        await settleTripEarnings({
          bookingId: 'booking-unpaid-settle',
          driverId: 'driver-1',
          grossAmount: 1000,
          paymentMethod: PaymentMethod.UPI,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'PAYMENT_REQUIRED');
        return true;
      },
      'settleTripEarnings must reject unpaid online bookings'
    );
  } finally {
    prisma.driverEarning.findUnique = originalDriverEarningFind;
    prisma.booking.findUnique = originalBookingFind;
    prisma.$transaction = originalTransaction;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FIN-004: CUSTOMER WALLET CONCURRENCY & MUTATION ATOMICITY
// ─────────────────────────────────────────────────────────────────────────────

test('FIN-004: deductMoney uses atomic conditional decrement and rejects overdraft (INSUFFICIENT_BALANCE)', async () => {
  const originalTransaction = prisma.$transaction;

  try {
    // Current balance is 100, but debit request is 250
    prisma.$transaction = async (cb) => {
      const mockTx = {
        wallet: {
          updateMany: async ({ where }) => {
            // where: { userId, cachedBalance: { gte: amount } }
            // Since balance 100 < 250, 0 rows match
            return { count: 0 };
          },
          findUnique: async () => ({
            id: 'wallet-1',
            userId: 'user-1',
            cachedBalance: 100,
          }),
        },
        walletTransaction: {
          create: async () => {
            assert.fail('Should never create transaction when debit fails');
          },
        },
      };
      return cb(mockTx);
    };

    await assert.rejects(
      async () => {
        await deductMoney('user-1', 250, WalletTransactionReason.BOOKING_PAYMENT, 'BOOKING-1');
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'INSUFFICIENT_BALANCE');
        assert.match(err.message, /Required: ₹250.00, Available: ₹100.00/);
        return true;
      },
      'deductMoney must reject when atomic conditional decrement returns count = 0'
    );
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test('FIN-004: addMoney executes atomic increment and sets balanceAfter matching updated record', async () => {
  const originalWalletFind = prisma.wallet.findUnique;
  const originalTransaction = prisma.$transaction;

  let capturedIncrement = null;
  let capturedTxBalanceAfter = null;

  try {
    prisma.wallet.findUnique = async () => ({
      id: 'wallet-1',
      userId: 'user-1',
      cachedBalance: 200,
    });

    prisma.$transaction = async (cb) => {
      const mockTx = {
        wallet: {
          update: async ({ where, data }) => {
            capturedIncrement = data.cachedBalance.increment;
            return { id: 'wallet-1', cachedBalance: 200 + capturedIncrement };
          },
        },
        walletTransaction: {
          create: async ({ data }) => {
            capturedTxBalanceAfter = data.balanceAfter;
            return { id: 'tx-1', ...data };
          },
        },
      };
      return cb(mockTx);
    };

    const res = await addMoney('user-1', 300, 'ADMIN-REF-1');

    assert.equal(capturedIncrement, 300, 'Must use atomic { increment: 300 }');
    assert.equal(capturedTxBalanceAfter, 500, 'balanceAfter must reflect atomic post-increment balance');
    assert.equal(res.wallet.cachedBalance, 500);
  } finally {
    prisma.wallet.findUnique = originalWalletFind;
    prisma.$transaction = originalTransaction;
  }
});

test('FIN-004: verifyTopUp is idempotent inside transaction and rejects duplicate razorpay_payment_id', async () => {
  const originalTransaction = prisma.$transaction;
  const originalSecret = process.env.RAZORPAY_KEY_SECRET;

  let walletIncrementCalled = false;

  try {
    const testSecret = 'test_webhook_secret_123';
    process.env.RAZORPAY_KEY_SECRET = testSecret;

    const orderId = 'order_topup_123';
    const paymentId = 'pay_duplicate_123';
    const signature = crypto
      .createHmac('sha256', testSecret)
      .update(orderId + '|' + paymentId)
      .digest('hex');

    prisma.$transaction = async (cb) => {
      const mockTx = {
        walletTransaction: {
          findFirst: async ({ where }) => {
            // Already processed!
            if (where.referenceId === paymentId) {
              return { id: 'tx-existing', amount: 500, referenceId: paymentId };
            }
            return null;
          },
          create: async () => {
            assert.fail('Should not create duplicate ledger row');
          },
        },
        wallet: {
          findUnique: async () => ({ id: 'wallet-1', cachedBalance: 1500 }),
          update: async () => {
            walletIncrementCalled = true;
          },
        },
      };
      return cb(mockTx);
    };

    // Mock razorpay orders and payments
    const { razorpay } = require('../dist/modules/payment/razorpay.client');
    const originalOrdersFetch = razorpay.orders.fetch;
    const originalPaymentsFetch = razorpay.payments.fetch;

    razorpay.orders.fetch = async () => ({
      id: orderId,
      notes: { userId: 'user-1', purpose: 'WALLET_TOPUP' },
      amount_paid: 50000,
      status: 'paid',
    });

    razorpay.payments.fetch = async () => ({
      id: paymentId,
      order_id: orderId,
      status: 'captured',
    });

    const result = await verifyTopUp('user-1', orderId, paymentId, signature);

    assert.equal(result.message, 'Already credited');
    assert.equal(walletIncrementCalled, false, 'Must not increment wallet on duplicate paymentId');

    razorpay.orders.fetch = originalOrdersFetch;
    razorpay.payments.fetch = originalPaymentsFetch;
  } finally {
    process.env.RAZORPAY_KEY_SECRET = originalSecret;
    prisma.$transaction = originalTransaction;
  }
});

test('FIN-004: refundToWallet is idempotent inside transaction and prevents double refunds', async () => {
  const originalTransaction = prisma.$transaction;
  let walletIncrementCalled = false;

  try {
    prisma.$transaction = async (cb) => {
      const mockTx = {
        walletTransaction: {
          findFirst: async ({ where }) => {
            if (where.referenceId === 'REFUND_booking-123') {
              return { id: 'refund-tx-1', amount: 450, referenceId: 'REFUND_booking-123' };
            }
            return null;
          },
          create: async () => {
            assert.fail('Should not create duplicate refund transaction');
          },
        },
        wallet: {
          findUnique: async () => ({ id: 'wallet-1', cachedBalance: 1000 }),
          update: async () => {
            walletIncrementCalled = true;
          },
        },
      };
      return cb(mockTx);
    };

    const result = await refundToWallet('user-1', 'booking-123', 450);

    assert.equal(result.message, 'Already refunded');
    assert.equal(walletIncrementCalled, false, 'Must not credit wallet when refund has already been recorded');
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test('FIN-004: creditCashback is idempotent inside transaction and prevents duplicate reward credits', async () => {
  const originalTransaction = prisma.$transaction;
  let walletIncrementCalled = false;

  try {
    prisma.$transaction = async (cb) => {
      const mockTx = {
        walletTransaction: {
          findFirst: async ({ where }) => {
            if (where.referenceId === 'REWARD-SCRATCH-456') {
              return { id: 'cb-tx-1', amount: 50 };
            }
            return null;
          },
          create: async () => {
            assert.fail('Should not create duplicate cashback transaction');
          },
        },
        wallet: {
          findUnique: async () => ({ id: 'wallet-1', cachedBalance: 500 }),
          update: async () => {
            walletIncrementCalled = true;
          },
        },
      };
      return cb(mockTx);
    };

    await creditCashback('user-1', 50, 'REWARD-SCRATCH-456');

    assert.equal(walletIncrementCalled, false, 'Must not credit wallet when cashback reference has already been consumed');
  } finally {
    prisma.$transaction = originalTransaction;
  }
});
