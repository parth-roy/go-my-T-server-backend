const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Schemas
const { createGigSchema, verifyGigPaymentSchema } = require('../dist/modules/gig/gig.schema');
const { VerifyLeadUnlockSchema } = require('../dist/modules/lead-unlock/lead-unlock.schema');
const { PaymentStatus } = require('@prisma/client');

test('SEC-004: createGigSchema strips or ignores client-supplied paymentStatus', () => {
  const parsed = createGigSchema.parse({
    locationAddress: 'Connaught Place, New Delhi',
    paymentStatus: 'PAID', // Malicious attempt to inject PAID status
  });
  // paymentStatus should not exist in validated schema
  assert.equal(parsed.paymentStatus, undefined);
});

test('SEC-004: verifyGigPaymentSchema rejects unexpected isMock field (or does not include it)', () => {
  const schemaKeys = Object.keys(verifyGigPaymentSchema.shape);
  assert.ok(!schemaKeys.includes('isMock'), 'verifyGigPaymentSchema must not expose an isMock parameter');
  
  // Valid required fields
  const valid = verifyGigPaymentSchema.safeParse({
    razorpayPaymentId: 'pay_1234567890',
    razorpayOrderId: 'order_1234567890',
    razorpaySignature: 'sig_abcdef',
  });
  assert.equal(valid.success, true);
});

test('SEC-004: VerifyLeadUnlockSchema requires payment credentials and excludes isMock', () => {
  const schemaKeys = Object.keys(VerifyLeadUnlockSchema.shape);
  assert.ok(!schemaKeys.includes('isMock'), 'VerifyLeadUnlockSchema must not expose an isMock parameter');

  // Must reject missing paymentId/signature
  const incomplete = VerifyLeadUnlockSchema.safeParse({
    transactionId: 'tx-12345',
  });
  assert.equal(incomplete.success, false);
  assert.ok(incomplete.error.issues.some((i) => i.path.includes('razorpayPaymentId')));
  assert.ok(incomplete.error.issues.some((i) => i.path.includes('razorpaySignature')));

  // Must accept complete parameters
  const complete = VerifyLeadUnlockSchema.safeParse({
    transactionId: 'tx-12345',
    razorpayPaymentId: 'pay_9988776655',
    razorpaySignature: 'sig_valid_hash',
  });
  assert.equal(complete.success, true);
});

test('SEC-003: adminVerifyDirectContactRequest rejects non-admin callers', async () => {
  const { adminVerifyDirectContactRequest } = require('../dist/modules/payment/payment.controller');

  // Unauthenticated caller (req.user is undefined)
  const reqUnauth = {
    body: { id: 'req-1', status: 'VERIFIED' },
  };
  let errorUnauth = null;
  await adminVerifyDirectContactRequest(reqUnauth, {}, (err) => {
    errorUnauth = err;
  });
  assert.ok(errorUnauth, 'Must produce error');
  assert.equal(errorUnauth.statusCode, 403);
  assert.match(errorUnauth.message, /Admin authorization required/i);

  // Authenticated non-admin caller (e.g. CUSTOMER)
  const reqCustomer = {
    user: { id: 'user-1', role: 'CUSTOMER' },
    body: { id: 'req-1', status: 'VERIFIED' },
  };
  let errorCustomer = null;
  await adminVerifyDirectContactRequest(reqCustomer, {}, (err) => {
    errorCustomer = err;
  });
  assert.ok(errorCustomer, 'Must produce error');
  assert.equal(errorCustomer.statusCode, 403);
  assert.match(errorCustomer.message, /Admin authorization required/i);
});

test('SEC-003: adminApproveUtr rejects non-admin callers and does not rely on static key', async () => {
  const { adminApproveUtr } = require('../dist/modules/payment/payment.controller');

  // Attempting to bypass using static key without admin session
  const reqWithStaticKey = {
    body: { utr: '123456789012', adminKey: 'parther4949' },
  };
  let error = null;
  await adminApproveUtr(reqWithStaticKey, {}, (err) => {
    error = err;
  });
  assert.ok(error, 'Must reject caller without admin user session');
  assert.equal(error.statusCode, 403);
  assert.match(error.message, /Admin authorization required/i);
});

test('SEC-004: verifyDirectContactPayment rejects mock_ and pay_test_ prefixes without valid signature', async () => {
  const { verifyDirectContactPayment } = require('../dist/modules/payment/payment.controller');

  const reqMock = {
    body: {
      razorpay_payment_id: 'mock_12345678',
      razorpay_order_id: 'order_123',
      razorpay_signature: 'invalid_sig',
    },
  };
  let error = null;
  await verifyDirectContactPayment(reqMock, {}, (err) => {
    error = err;
  });
  assert.ok(error, 'Must reject mock payment id without valid signature');
  assert.equal(error.statusCode, 400);
  assert.match(error.message, /Invalid payment signature/i);

  const reqPayTest = {
    body: {
      razorpay_payment_id: 'pay_test_12345678',
    },
  };
  let errorPayTest = null;
  await verifyDirectContactPayment(reqPayTest, {}, (err) => {
    errorPayTest = err;
  });
  assert.ok(errorPayTest, 'Must reject pay_test_ without valid signature');
  assert.match(errorPayTest.message, /Incomplete Razorpay payment verification details|Invalid payment signature/i);
});
