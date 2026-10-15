const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Modules under test
const { verifyGigPayment, getGigById } = require('../dist/modules/gig/gig.service');
const { verifyTopUp } = require('../dist/modules/wallet/wallet.service');
const { verifyCommissionPayment } = require('../dist/modules/driver-wallet/driver-wallet.service');
const { prisma } = require('../dist/shared/db/prisma');
const { razorpay } = require('../dist/modules/payment/razorpay.client');

test('SEC-005: verifyGigPayment rejects order ID that does not match gig.razorpayOrderId', async () => {
  const originalFindUnique = prisma.gigJob.findUnique;
  try {
    prisma.gigJob.findUnique = async () => ({
      id: 'gig-123',
      customerId: 'user-owner',
      razorpayOrderId: 'order_legit_123',
      totalFare: 5000,
    });

    await assert.rejects(
      async () => {
        await verifyGigPayment('user-owner', 'gig-123', {
          razorpayPaymentId: 'pay_123',
          razorpayOrderId: 'order_unrelated_foreign_order',
          razorpaySignature: 'sig123',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Provided order ID does not match this gig booking order/i);
        return true;
      }
    );
  } finally {
    prisma.gigJob.findUnique = originalFindUnique;
  }
});

test('SEC-005: verifyTopUp rejects order if notes.userId does not match calling user', async () => {
  const originalOrderFetch = razorpay.orders.fetch;
  const originalPaymentFetch = razorpay.payments.fetch;
  const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_for_unit_tests_12345678';
  process.env.RAZORPAY_KEY_SECRET = secret;

  const orderId = 'order_test_topup_1';
  const paymentId = 'pay_test_topup_1';
  const validSig = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  try {
    razorpay.orders.fetch = async () => ({
      id: orderId,
      amount: 50000,
      amount_paid: 50000,
      status: 'paid',
      notes: {
        userId: 'user-A-owner',
        purpose: 'WALLET_TOPUP',
      },
    });

    // User B tries to claim User A's top-up
    await assert.rejects(
      async () => {
        await verifyTopUp('user-B-attacker', orderId, paymentId, validSig);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Payment order belongs to another account/i);
        return true;
      }
    );
  } finally {
    razorpay.orders.fetch = originalOrderFetch;
    razorpay.payments.fetch = originalPaymentFetch;
  }
});

test('SEC-005: verifyTopUp rejects order when order is not paid (amount_paid is 0)', async () => {
  const originalOrderFetch = razorpay.orders.fetch;
  const originalPaymentFetch = razorpay.payments.fetch;
  const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_for_unit_tests_12345678';
  process.env.RAZORPAY_KEY_SECRET = secret;

  const orderId = 'order_test_unpaid_1';
  const paymentId = 'pay_test_unpaid_1';
  const validSig = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  try {
    razorpay.orders.fetch = async () => ({
      id: orderId,
      amount: 100000,
      amount_paid: 0, // Unpaid order
      status: 'created',
      notes: {
        userId: 'user-A',
        purpose: 'WALLET_TOPUP',
      },
    });
    razorpay.payments.fetch = async () => ({
      id: paymentId,
      order_id: orderId,
      amount: 0,
      status: 'captured',
    });

    await assert.rejects(
      async () => {
        await verifyTopUp('user-A', orderId, paymentId, validSig);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Order has not been fully paid or verified/i);
        return true;
      }
    );
  } finally {
    razorpay.orders.fetch = originalOrderFetch;
    razorpay.payments.fetch = originalPaymentFetch;
  }
});

test('SEC-005: verifyCommissionPayment rejects uncaptured payment', async () => {
  const originalPaymentFetch = razorpay.payments.fetch;
  const originalFindFirst = prisma.driverWalletTransaction.findFirst;
  const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_for_unit_tests_12345678';
  process.env.RAZORPAY_KEY_SECRET = secret;

  const orderId = 'order_comm_1';
  const paymentId = 'pay_comm_1';
  const validSig = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  try {
    prisma.driverWalletTransaction.findFirst = async () => null;
    razorpay.payments.fetch = async () => ({
      id: paymentId,
      order_id: orderId,
      amount: 50000,
      status: 'failed', // Not captured
      notes: {
        driverId: 'driver-1',
        purpose: 'commission_payment',
      },
    });

    await assert.rejects(
      async () => {
        await verifyCommissionPayment('driver-1', orderId, paymentId, validSig);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Payment has not been captured successfully/i);
        return true;
      }
    );
  } finally {
    razorpay.payments.fetch = originalPaymentFetch;
    prisma.driverWalletTransaction.findFirst = originalFindFirst;
  }
});

test('SEC-006: getGigById enforces object-level authorization (BOLA defense)', async () => {
  const originalFindUnique = prisma.gigJob.findUnique;
  try {
    prisma.gigJob.findUnique = async () => ({
      id: 'gig-secure-1',
      customerId: 'customer-owner-id',
      tasks: [],
      assignments: [
        { workerId: 'worker-1', worker: { userId: 'worker-user-id' } }
      ],
    });

    // 1. Unrelated customer should be rejected with 403 Forbidden
    await assert.rejects(
      async () => {
        await getGigById('gig-secure-1', 'unrelated-customer-id', 'CUSTOMER');
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Access denied to this gig/i);
        return true;
      }
    );

    // 2. Legitimate owner customer should be allowed
    const ownerResult = await getGigById('gig-secure-1', 'customer-owner-id', 'CUSTOMER');
    assert.equal(ownerResult.id, 'gig-secure-1');

    // 3. Admin should be allowed
    const adminResult = await getGigById('gig-secure-1', 'admin-id', 'ADMIN');
    assert.equal(adminResult.id, 'gig-secure-1');

    // 4. Assigned worker should be allowed
    const workerResult = await getGigById('gig-secure-1', 'worker-user-id', 'WORKER');
    assert.equal(workerResult.id, 'gig-secure-1');
  } finally {
    prisma.gigJob.findUnique = originalFindUnique;
  }
});
