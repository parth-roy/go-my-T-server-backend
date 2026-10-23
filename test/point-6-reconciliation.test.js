const test = require('node:test');
const assert = require('node:assert/strict');

const { ReconciliationService } = require('../dist/modules/reconciliation/reconciliation.service');
const { prisma } = require('../dist/shared/db/prisma');
const {
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  ReconciliationCategory,
  ReconciliationSeverity,
  ReconciliationStatus,
  WalletTransactionType,
} = require('@prisma/client');

test('POINT-6 [Paid-But-Uncredited Auto-Resolution]: detects captured payment and secures booking', async () => {
  const origFindMany = prisma.booking.findMany;
  const origFindPaymentTx = prisma.paymentTransaction.findFirst;
  const origCreateException = prisma.reconciliationException.create;
  const origUpdateMany = prisma.booking.updateMany;
  const origFindUniqueOrThrow = prisma.booking.findUniqueOrThrow;
  const origFindUnique = prisma.booking.findUnique;
  const origTransaction = prisma.$transaction;

  let exceptionCreated = null;
  let securedBookingId = null;

  try {
    prisma.booking.findMany = async () => [
      {
        id: 'bk-uncredited-1',
        bookingNumber: 'BK-UNCRED-001',
        bookingCode: 'BK-UNCRED-001',
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.CARD,
        grandTotal: 1500,
        totalFare: 1500,
        razorpayOrderId: 'order_recon_1',
        paymentRef: null,
        createdAt: new Date(),
      },
    ];

    prisma.paymentTransaction.findFirst = async () => ({
      id: 'ptx-1',
      razorpayOrderId: 'order_recon_1',
      razorpayPaymentId: 'pay_recon_1',
      status: 'SUCCESS',
      amount: 1500,
      currency: 'INR',
    });

    prisma.$transaction = async (cb) => {
      const mockTx = {
        booking: {
          findUnique: async () => ({
            id: 'bk-uncredited-1',
            status: BookingStatus.CONFIRMED,
            paymentStatus: PaymentStatus.PENDING,
            grandTotal: 1500,
            razorpayOrderId: 'order_recon_1',
          }),
          updateMany: async ({ where }) => {
            securedBookingId = where.id;
            return { count: 1 };
          },
          findUniqueOrThrow: async () => ({
            id: 'bk-uncredited-1',
            paymentStatus: PaymentStatus.PAID,
          }),
        },
      };
      return cb(mockTx);
    };

    prisma.reconciliationException.create = async ({ data }) => {
      exceptionCreated = data;
      return { id: 'ex-1', ...data };
    };

    const res = await ReconciliationService.reconcilePaidButUncredited();

    assert.equal(res.scanned, 1);
    assert.equal(res.autoResolved, 1);
    assert.equal(securedBookingId, 'bk-uncredited-1');
    assert.equal(exceptionCreated.status, ReconciliationStatus.AUTO_RESOLVED);
    assert.equal(exceptionCreated.category, ReconciliationCategory.PAID_UNCREDITED);
    assert.equal(exceptionCreated.resolvedBy, 'SYSTEM_AUTO_RECONCILE');
  } finally {
    prisma.booking.findMany = origFindMany;
    prisma.paymentTransaction.findFirst = origFindPaymentTx;
    prisma.reconciliationException.create = origCreateException;
    prisma.booking.updateMany = origUpdateMany;
    prisma.booking.findUniqueOrThrow = origFindUniqueOrThrow;
    prisma.booking.findUnique = origFindUnique;
    prisma.$transaction = origTransaction;
  }
});

test('POINT-6 [Paid-But-Uncredited Conflict]: flags critical exception if booking is cancelled', async () => {
  const origFindMany = prisma.booking.findMany;
  const origFindPaymentTx = prisma.paymentTransaction.findFirst;
  const origCreateException = prisma.reconciliationException.create;

  let exceptionCreated = null;

  try {
    prisma.booking.findMany = async () => [
      {
        id: 'bk-canc-paid',
        bookingNumber: 'BK-CANC-001',
        bookingCode: 'BK-CANC-001',
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.UPI,
        grandTotal: 800,
        totalFare: 800,
        razorpayOrderId: 'order_canc_1',
        paymentRef: null,
        createdAt: new Date(),
      },
    ];

    prisma.paymentTransaction.findFirst = async () => ({
      id: 'ptx-canc',
      razorpayOrderId: 'order_canc_1',
      razorpayPaymentId: 'pay_canc_1',
      status: 'SUCCESS',
      amount: 800,
      currency: 'INR',
    });

    prisma.reconciliationException.create = async ({ data }) => {
      exceptionCreated = data;
      return { id: 'ex-canc', ...data };
    };

    const res = await ReconciliationService.reconcilePaidButUncredited();

    assert.equal(res.scanned, 1);
    assert.equal(res.autoResolved, 0);
    assert.equal(res.exceptionsCreated, 1);
    assert.equal(exceptionCreated.category, ReconciliationCategory.PAID_UNCREDITED);
    assert.equal(exceptionCreated.severity, ReconciliationSeverity.CRITICAL);
    assert.equal(exceptionCreated.status, ReconciliationStatus.OPEN);
    assert.match(exceptionCreated.details.reason, /cancelled/i);
  } finally {
    prisma.booking.findMany = origFindMany;
    prisma.paymentTransaction.findFirst = origFindPaymentTx;
    prisma.reconciliationException.create = origCreateException;
  }
});

test('POINT-6 [Completed-But-Unsettled Auto-Settlement]: auto-settles completed paid trip', async () => {
  const origFindMany = prisma.booking.findMany;
  const origCreateException = prisma.reconciliationException.create;
  const origTransaction = prisma.$transaction;

  let exceptionCreated = null;
  let settledBookingId = null;

  try {
    prisma.booking.findMany = async () => [
      {
        id: 'bk-unsettled-1',
        bookingNumber: 'BK-UNSETT-001',
        bookingCode: 'BK-UNSETT-001',
        driverId: 'drv-unsett-1',
        awardedFleetOwnerId: null,
        status: BookingStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CARD,
        grandTotal: 2000,
        totalFare: 2000,
        createdAt: new Date(Date.now() - 3600000),
      },
    ];

    prisma.$transaction = async (cb) => {
      const mockTx = {
        booking: {
          findUnique: async () => ({ paymentStatus: PaymentStatus.PAID }),
        },
        driverEarning: {
          findUnique: async () => null,
          create: async ({ data }) => {
            settledBookingId = data.bookingId;
            return { id: 'earn-1', ...data };
          },
        },
        driverWallet: {
          upsert: async () => ({ id: 'dw-1', cachedBalance: 1700 }),
          update: async () => ({ id: 'dw-1', cachedBalance: 1700 }),
          findUnique: async () => ({ id: 'dw-1', cachedBalance: 1700 }),
        },
        driverWalletTransaction: {
          create: async () => ({ id: 'dwt-1' }),
        },
      };
      return cb(mockTx);
    };

    prisma.reconciliationException.create = async ({ data }) => {
      exceptionCreated = data;
      return { id: 'ex-settled', ...data };
    };

    const res = await ReconciliationService.reconcileCompletedButUnsettled();

    assert.equal(res.scanned, 1);
    assert.equal(res.autoResolved, 1);
    assert.equal(settledBookingId, 'bk-unsettled-1');
    assert.equal(exceptionCreated.status, ReconciliationStatus.AUTO_RESOLVED);
    assert.equal(exceptionCreated.category, ReconciliationCategory.COMPLETED_UNSETTLED);
  } finally {
    prisma.booking.findMany = origFindMany;
    prisma.reconciliationException.create = origCreateException;
    prisma.$transaction = origTransaction;
  }
});

test('POINT-6 [Completed-But-Unsettled Unpaid Online Trip]: blocks disbursement and creates open exception', async () => {
  const origFindMany = prisma.booking.findMany;
  const origCreateException = prisma.reconciliationException.create;

  let exceptionCreated = null;

  try {
    prisma.booking.findMany = async () => [
      {
        id: 'bk-unsettled-unpaid',
        bookingNumber: 'BK-UNPAID-001',
        bookingCode: 'BK-UNPAID-001',
        driverId: 'drv-unsett-2',
        awardedFleetOwnerId: null,
        status: BookingStatus.COMPLETED,
        paymentStatus: PaymentStatus.PENDING, // Unpaid online trip!
        paymentMethod: PaymentMethod.UPI,
        grandTotal: 1200,
        totalFare: 1200,
        createdAt: new Date(Date.now() - 3600000),
      },
    ];

    prisma.reconciliationException.create = async ({ data }) => {
      exceptionCreated = data;
      return { id: 'ex-unpaid', ...data };
    };

    const res = await ReconciliationService.reconcileCompletedButUnsettled();

    assert.equal(res.scanned, 1);
    assert.equal(res.autoResolved, 0);
    assert.equal(res.exceptionsCreated, 1);
    assert.equal(exceptionCreated.category, ReconciliationCategory.COMPLETED_UNSETTLED);
    assert.equal(exceptionCreated.severity, ReconciliationSeverity.HIGH);
    assert.equal(exceptionCreated.status, ReconciliationStatus.OPEN);
    assert.match(exceptionCreated.details.reason, /Uncollected platform liability/i);
  } finally {
    prisma.booking.findMany = origFindMany;
    prisma.reconciliationException.create = origCreateException;
  }
});

test('POINT-6 [Ledger Discrepancy Detection]: audits balance against transaction log and flags mismatch', async () => {
  const origDriverWalletFindMany = prisma.driverWallet.findMany;
  const origUserWalletFindMany = prisma.wallet.findMany;
  const origFleetWalletFindMany = prisma.fleetWallet.findMany;
  const origCreateException = prisma.reconciliationException.create;

  const createdExceptions = [];

  try {
    // Mock driver wallet with cachedBalance = 1000, but sum of transactions = 600 (400 discrepancy!)
    prisma.driverWallet.findMany = async () => [
      {
        id: 'dw-corrupt-1',
        driverId: 'drv-corr-1',
        cachedBalance: 1000,
        transactions: [
          { type: WalletTransactionType.CREDIT, amount: 800 },
          { type: WalletTransactionType.DEBIT, amount: 200 },
          // Net = 600, but cached is 1000!
        ],
      },
    ];

    prisma.wallet.findMany = async () => [];
    prisma.fleetWallet.findMany = async () => [];

    prisma.reconciliationException.create = async ({ data }) => {
      createdExceptions.push(data);
      return { id: `ex-${createdExceptions.length}`, ...data };
    };

    const res = await ReconciliationService.reconcileLedgerDiscrepancies();

    assert.equal(res.scannedWallets, 1);
    assert.equal(res.discrepanciesFound, 1);
    assert.equal(createdExceptions.length, 1);
    const ex = createdExceptions[0];
    assert.equal(ex.category, ReconciliationCategory.LEDGER_MISMATCH);
    assert.equal(ex.severity, ReconciliationSeverity.CRITICAL);
    assert.equal(ex.status, ReconciliationStatus.OPEN);
    assert.equal(ex.expectedAmount, 600);
    assert.equal(ex.actualAmount, 1000);
    assert.equal(ex.discrepancyAmount, 400);
  } finally {
    prisma.driverWallet.findMany = origDriverWalletFindMany;
    prisma.wallet.findMany = origUserWalletFindMany;
    prisma.fleetWallet.findMany = origFleetWalletFindMany;
    prisma.reconciliationException.create = origCreateException;
  }
});

test('POINT-6 [Exception Queue Management]: resolveException marks exception resolved with audit note', async () => {
  const origUpdate = prisma.reconciliationException.update;

  let updateCalledWith = null;

  try {
    prisma.reconciliationException.update = async ({ where, data }) => {
      updateCalledWith = { where, data };
      return { id: where.id, ...data };
    };

    const updated = await ReconciliationService.resolveException(
      'ex-123',
      'admin-usr-1',
      'Investigated and verified manual bank settlement with bank statement'
    );

    assert.equal(updateCalledWith.where.id, 'ex-123');
    assert.equal(updateCalledWith.data.status, ReconciliationStatus.RESOLVED);
    assert.equal(updateCalledWith.data.resolvedBy, 'admin-usr-1');
    assert.equal(
      updateCalledWith.data.resolutionNote,
      'Investigated and verified manual bank settlement with bank statement'
    );
    assert.ok(updateCalledWith.data.resolvedAt instanceof Date);
  } finally {
    prisma.reconciliationException.update = origUpdate;
  }
});
