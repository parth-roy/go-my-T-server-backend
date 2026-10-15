const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// Modules under test
const { completeJob } = require('../dist/modules/workforce/workforce.service');
const { razorpayWebhook } = require('../dist/modules/payment/payment.controller');
const { createTopUpOrder } = require('../dist/modules/wallet/wallet.service');
const { prisma } = require('../dist/shared/db/prisma');
const { razorpay } = require('../dist/modules/payment/razorpay.client');
const { WorkerStatus, WorkerJobStatus, PaymentType, WalletTransactionType, WalletTransactionReason } = require('@prisma/client');

// ─────────────────────────────────────────────────────────────────────────────
// FIN-005: WORKFORCE JOB COMPLETION & WHATSAPP REPEAT PAYMENT DEFENSE
// ─────────────────────────────────────────────────────────────────────────────

test('FIN-005: completeJob rejects completing already-completed WhatsApp inquiries', async () => {
  const originalWorkerFind = prisma.worker.findUnique;
  const originalJobAssignmentFind = prisma.jobAssignment.findFirst;
  const originalGigAssignmentFind = prisma.gigAssignment.findFirst;
  const originalWaFind = prisma.workforceWhatsAppInquiry.findFirst;

  try {
    prisma.worker.findUnique = async () => ({
      id: 'worker-1',
      userId: 'user-worker-1',
      status: WorkerStatus.BUSY,
    });

    prisma.jobAssignment.findFirst = async () => null;
    prisma.gigAssignment.findFirst = async () => null;

    // Persisted status is already COMPLETED!
    prisma.workforceWhatsAppInquiry.findFirst = async () => ({
      id: 'wa-job-completed-1',
      assignedWorkerId: 'worker-1',
      status: 'COMPLETED',
      payoutAmount: 600,
    });

    await assert.rejects(
      async () => {
        await completeJob('user-worker-1', 'wa-job-completed-1', {});
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'INVALID_TRANSITION');
        assert.match(err.message, /Workforce WhatsApp job is already completed/);
        return true;
      },
      'Already completed WhatsApp workforce jobs must be rejected'
    );
  } finally {
    prisma.worker.findUnique = originalWorkerFind;
    prisma.jobAssignment.findFirst = originalJobAssignmentFind;
    prisma.gigAssignment.findFirst = originalGigAssignmentFind;
    prisma.workforceWhatsAppInquiry.findFirst = originalWaFind;
  }
});

test('FIN-005: completeJob uses atomic conditional claim to prevent duplicate WhatsApp completion races', async () => {
  const originalWorkerFind = prisma.worker.findUnique;
  const originalJobAssignmentFind = prisma.jobAssignment.findFirst;
  const originalGigAssignmentFind = prisma.gigAssignment.findFirst;
  const originalWaFind = prisma.workforceWhatsAppInquiry.findFirst;
  const originalTransaction = prisma.$transaction;

  try {
    prisma.worker.findUnique = async () => ({
      id: 'worker-1',
      userId: 'user-worker-1',
      status: WorkerStatus.BUSY,
    });

    prisma.jobAssignment.findFirst = async () => null;
    prisma.gigAssignment.findFirst = async () => null;

    prisma.workforceWhatsAppInquiry.findFirst = async () => ({
      id: 'wa-job-race-1',
      assignedWorkerId: 'worker-1',
      status: 'ASSIGNED',
      payoutAmount: 500,
    });

    // Simulate concurrent thread where another caller already claimed COMPLETED (count = 0)
    prisma.$transaction = async (cb) => {
      const mockTx = {
        workforceWhatsAppInquiry: {
          updateMany: async () => ({ count: 0 }), // 0 rows updated! Already claimed!
        },
      };
      return cb(mockTx);
    };

    await assert.rejects(
      async () => {
        await completeJob('user-worker-1', 'wa-job-race-1', {});
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'INVALID_TRANSITION');
        assert.match(err.message, /already completed or not assigned to you/);
        return true;
      },
      'Concurrent completion attempt on already-claimed WhatsApp job must be rejected with 409'
    );
  } finally {
    prisma.worker.findUnique = originalWorkerFind;
    prisma.jobAssignment.findFirst = originalJobAssignmentFind;
    prisma.gigAssignment.findFirst = originalGigAssignmentFind;
    prisma.workforceWhatsAppInquiry.findFirst = originalWaFind;
    prisma.$transaction = originalTransaction;
  }
});

test('FIN-005: completeJob enforces idempotency on wallet settlement, never crediting twice', async () => {
  const originalWorkerFind = prisma.worker.findUnique;
  const originalUserFind = prisma.user.findUnique;
  const originalNotificationCreate = prisma.userNotification.create;
  const originalJobAssignmentFind = prisma.jobAssignment.findFirst;
  const originalGigAssignmentFind = prisma.gigAssignment.findFirst;
  const originalWaFind = prisma.workforceWhatsAppInquiry.findFirst;
  const originalTransaction = prisma.$transaction;

  let walletMutationCount = 0;
  let ledgerTransactionCount = 0;

  try {
    prisma.user.findUnique = async () => null;
    prisma.userNotification.create = async () => ({ id: 'notif-1' });

    prisma.worker.findUnique = async () => ({
      id: 'worker-1',
      userId: 'user-worker-1',
      status: WorkerStatus.BUSY,
    });

    prisma.jobAssignment.findFirst = async () => null;
    prisma.gigAssignment.findFirst = async () => null;

    prisma.workforceWhatsAppInquiry.findFirst = async () => ({
      id: 'wa-job-idempotent-1',
      assignedWorkerId: 'worker-1',
      status: 'ASSIGNED',
      payoutAmount: 500,
    });

    prisma.$transaction = async (cb) => {
      const mockTx = {
        workforceWhatsAppInquiry: {
          updateMany: async () => ({ count: 1 }),
        },
        worker: {
          update: async () => ({ id: 'worker-1' }),
          findUnique: async () => ({ id: 'worker-1' }),
        },
        workerWalletTransaction: {
          // Earning already credited previously!
          findFirst: async () => ({
            id: 'wwt-existing',
            amount: 425,
            referenceId: 'wa-job-idempotent-1',
          }),
          create: async () => {
            ledgerTransactionCount++;
          },
        },
        workerWallet: {
          findUnique: async () => ({ id: 'wallet-1', cachedBalance: 850 }),
          upsert: async () => {
            walletMutationCount++;
          },
        },
      };
      return cb(mockTx);
    };

    // Complete job
    await completeJob('user-worker-1', 'wa-job-idempotent-1', {});

    assert.equal(walletMutationCount, 0, 'Must NOT mutate wallet balance on duplicate completion');
    assert.equal(ledgerTransactionCount, 0, 'Must NOT insert duplicate ledger row on duplicate completion');
  } finally {
    prisma.user.findUnique = originalUserFind;
    prisma.userNotification.create = originalNotificationCreate;
    prisma.worker.findUnique = originalWorkerFind;
    prisma.jobAssignment.findFirst = originalJobAssignmentFind;
    prisma.gigAssignment.findFirst = originalGigAssignmentFind;
    prisma.workforceWhatsAppInquiry.findFirst = originalWaFind;
    prisma.$transaction = originalTransaction;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FIN-006: WEBHOOK PROCESSING & PAYMENT RECOVERY
// ─────────────────────────────────────────────────────────────────────────────

test('FIN-006: createTopUpOrder explicitly sets paymentType: WALLET_TOPUP in order notes', async () => {
  const originalWalletFind = prisma.wallet.findUnique;
  const originalOrdersCreate = razorpay.orders.create;

  let capturedNotes = null;

  try {
    prisma.wallet.findUnique = async () => ({ id: 'wallet-1', userId: 'user-1' });

    razorpay.orders.create = async ({ amount, currency, receipt, notes }) => {
      capturedNotes = notes;
      return { id: 'order_topup_test_1', amount, currency, notes };
    };

    await createTopUpOrder('user-1', 500);

    assert.ok(capturedNotes, 'Notes must be provided to Razorpay order');
    assert.equal(capturedNotes.userId, 'user-1');
    assert.equal(capturedNotes.purpose, 'WALLET_TOPUP');
    assert.equal(capturedNotes.paymentType, PaymentType.WALLET_TOPUP, 'Notes must explicitly include paymentType WALLET_TOPUP');
  } finally {
    prisma.wallet.findUnique = originalWalletFind;
    razorpay.orders.create = originalOrdersCreate;
  }
});

test('FIN-006: Webhook accurately routes and credits wallet top-up using valid TOP_UP enum in atomic transaction', async () => {
  const originalWebhookFind = prisma.processedWebhook.findUnique;
  const originalWebhookUpsert = prisma.processedWebhook.upsert;
  const originalTransaction = prisma.$transaction;
  const originalOrdersFetch = razorpay.orders.fetch;
  const originalPaymentTxUpdate = prisma.paymentTransaction.updateMany;

  let creditedAmount = 0;
  let capturedTransactionReason = null;
  let webhookRecorded = false;

  try {
    const webhookSecret = 'test_webhook_secret_fin006';
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    const eventId = 'evt_wallet_topup_123';
    const orderId = 'order_topup_999';
    const paymentId = 'pay_topup_999';

    prisma.processedWebhook.findUnique = async () => null; // Not previously processed
    prisma.processedWebhook.upsert = async () => {
      webhookRecorded = true;
    };
    prisma.paymentTransaction.updateMany = async () => ({ count: 1 });

    razorpay.orders.fetch = async () => ({
      id: orderId,
      receipt: 'W_user1_12345',
      notes: { userId: 'user-topup-1', purpose: 'WALLET_TOPUP' },
    });

    prisma.$transaction = async (cb) => {
      const mockTx = {
        walletTransaction: {
          findFirst: async () => null, // Not previously credited
          create: async ({ data }) => {
            capturedTransactionReason = data.reason;
            return { id: 'tx-1', ...data };
          },
        },
        wallet: {
          findUnique: async () => ({ id: 'w-1', userId: 'user-topup-1', cachedBalance: 100 }),
          update: async ({ data }) => {
            creditedAmount += data.cachedBalance.increment;
            return { id: 'w-1', cachedBalance: 100 + creditedAmount };
          },
        },
      };
      return cb(mockTx);
    };

    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 50000, // 500 INR in paise
            notes: { userId: 'user-topup-1', purpose: 'WALLET_TOPUP' },
          },
        },
      },
    };

    const rawBody = Buffer.from(JSON.stringify(webhookPayload));
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const req = {
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': eventId,
      },
      body: rawBody,
    };

    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(s) {
        responseStatus = s;
        return this;
      },
      json(b) {
        responseBody = b;
        return this;
      },
    };

    await razorpayWebhook(req, res, () => {});

    assert.equal(responseStatus, 200);
    assert.equal(creditedAmount, 500, 'Wallet must be credited ₹500');
    assert.equal(
      capturedTransactionReason,
      WalletTransactionReason.TOP_UP,
      'Must use valid Prisma enum WalletTransactionReason.TOP_UP, not TOPUP'
    );
    assert.equal(webhookRecorded, true, 'Event must be durably recorded after successful processing');
  } finally {
    prisma.processedWebhook.findUnique = originalWebhookFind;
    prisma.processedWebhook.upsert = originalWebhookUpsert;
    prisma.$transaction = originalTransaction;
    razorpay.orders.fetch = originalOrdersFetch;
    prisma.paymentTransaction.updateMany = originalPaymentTxUpdate;
  }
});

test('FIN-006: Webhook returns 500 and does NOT record processedWebhook on internal processing failure', async () => {
  const originalWebhookFind = prisma.processedWebhook.findUnique;
  const originalWebhookUpsert = prisma.processedWebhook.upsert;
  const originalTransaction = prisma.$transaction;
  const originalOrdersFetch = razorpay.orders.fetch;
  const originalPaymentTxUpdate = prisma.paymentTransaction.updateMany;

  let webhookRecorded = false;

  try {
    const webhookSecret = 'test_webhook_secret_fin006';
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    const eventId = 'evt_fail_recovery_123';
    const orderId = 'order_fail_123';
    const paymentId = 'pay_fail_123';

    prisma.processedWebhook.findUnique = async () => null; // Not yet processed
    prisma.processedWebhook.upsert = async () => {
      webhookRecorded = true;
    };
    prisma.paymentTransaction.updateMany = async () => ({ count: 1 });

    razorpay.orders.fetch = async () => ({
      id: orderId,
      notes: { paymentType: 'WALLET_TOPUP', userId: 'user_fail_123' },
    });

    // Simulate database crash during payment processing
    prisma.$transaction = async () => {
      throw new Error('Database connection lost during payment settlement');
    };

    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: 100000,
            notes: { paymentType: 'WALLET_TOPUP', userId: 'user_fail_123' },
          },
        },
      },
    };

    const rawBody = Buffer.from(JSON.stringify(webhookPayload));
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    const req = {
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': eventId,
      },
      body: rawBody,
    };

    let responseStatus = 0;
    let responseBody = null;
    const res = {
      status(s) {
        responseStatus = s;
        return this;
      },
      json(b) {
        responseBody = b;
        return this;
      },
    };

    await razorpayWebhook(req, res, () => {});

    // CRITICAL: Webhook MUST fail with 500 to trigger gateway retry!
    assert.equal(responseStatus, 500, 'Must return HTTP 500 so Razorpay retries webhook');
    assert.equal(webhookRecorded, false, 'Event MUST NOT be marked processed when an error occurred');
  } finally {
    prisma.processedWebhook.findUnique = originalWebhookFind;
    prisma.processedWebhook.upsert = originalWebhookUpsert;
    prisma.$transaction = originalTransaction;
    razorpay.orders.fetch = originalOrdersFetch;
    prisma.paymentTransaction.updateMany = originalPaymentTxUpdate;
  }
});
