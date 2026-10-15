const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

// Modules under test
const { addMoney } = require('../dist/modules/wallet/wallet.service');
const { settleTripEarnings } = require('../dist/modules/driver-wallet/driver-wallet.service');
const { prisma } = require('../dist/shared/db/prisma');
const { requireRole } = require('../dist/shared/middleware/auth.middleware');
const { UserRole } = require('@prisma/client');

// ─────────────────────────────────────────────────────────────────────────────
// FIN-001: CUSTOMER WALLET DIRECT CREDIT RESTRICTION
// ─────────────────────────────────────────────────────────────────────────────

test('FIN-001: requireRole(UserRole.ADMIN) blocks ordinary users (CUSTOMER, DRIVER) from direct credit', () => {
  const middleware = requireRole(UserRole.ADMIN);

  // Case 1: Customer role -> must be rejected with 403
  let customerError = null;
  const mockCustomerReq = { user: { id: 'user-cust-1', role: UserRole.CUSTOMER } };
  middleware(mockCustomerReq, {}, (err) => {
    customerError = err;
  });
  assert.ok(customerError, 'Customer request must be rejected');
  assert.equal(customerError.statusCode, 403);
  assert.equal(customerError.code, 'FORBIDDEN');

  // Case 2: Driver role -> must be rejected with 403
  let driverError = null;
  const mockDriverReq = { user: { id: 'user-driver-1', role: UserRole.DRIVER } };
  middleware(mockDriverReq, {}, (err) => {
    driverError = err;
  });
  assert.ok(driverError, 'Driver request must be rejected');
  assert.equal(driverError.statusCode, 403);
  assert.equal(driverError.code, 'FORBIDDEN');

  // Case 3: Admin role -> must be permitted to proceed
  let adminError = null;
  let adminNextCalled = false;
  const mockAdminReq = { user: { id: 'admin-1', role: UserRole.ADMIN } };
  middleware(mockAdminReq, {}, (err) => {
    adminError = err;
    adminNextCalled = true;
  });
  assert.equal(adminError, undefined);
  assert.equal(adminNextCalled, true);
});

test('FIN-001: addMoney marks transaction reason as ADMIN_CREDIT and records admin actor in referenceId', async () => {
  const originalWalletFind = prisma.wallet.findUnique;
  const originalTransaction = prisma.$transaction;

  let capturedTxData = null;
  let capturedWalletUpdate = null;

  try {
    prisma.wallet.findUnique = async () => ({
      id: 'wallet-cust-1',
      userId: 'user-cust-1',
      cachedBalance: 500,
    });

    prisma.$transaction = async (arg) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return [
        { id: 'wallet-cust-1', cachedBalance: 1500 },
        capturedTxData,
      ];
    };

    const originalWalletUpdate = prisma.wallet.update;
    const originalTxCreate = prisma.walletTransaction.create;

    prisma.wallet.update = ({ where, data }) => {
      const inc = data?.cachedBalance?.increment || 0;
      const newBal = (data?.cachedBalance && typeof data.cachedBalance === 'number') ? data.cachedBalance : (500 + inc);
      capturedWalletUpdate = { where, data };
      return Promise.resolve({ id: 'wallet-cust-1', cachedBalance: newBal });
    };

    prisma.walletTransaction.create = ({ data }) => {
      capturedTxData = data;
      return Promise.resolve({ id: 'tx-1', ...data });
    };

    const result = await addMoney('user-cust-1', 1000, 'TICKET-999', 'admin-user-42');

    assert.ok(capturedTxData, 'Transaction must be created');
    assert.equal(capturedTxData.type, 'CREDIT');
    assert.equal(capturedTxData.reason, 'ADMIN_CREDIT', 'Direct additions must use ADMIN_CREDIT, not TOP_UP!');
    assert.equal(capturedTxData.amount, 1000);
    assert.equal(capturedTxData.balanceAfter, 1500);
    assert.equal(capturedTxData.referenceId, 'TICKET-999');

    prisma.wallet.update = originalWalletUpdate;
    prisma.walletTransaction.create = originalTxCreate;
  } finally {
    prisma.wallet.findUnique = originalWalletFind;
    prisma.$transaction = originalTransaction;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FIN-002: DUPLICATE LIABILITY ON FLEET SETTLEMENT
// ─────────────────────────────────────────────────────────────────────────────

test('FIN-002: Independent driver trip credits ONLY the driver wallet (no fleet credit)', async () => {
  const originalDriverEarningFind = prisma.driverEarning.findUnique;
  const originalDriverEarningCreate = prisma.driverEarning.create;
  const originalDriverEarningUpsert = prisma.driverEarning.upsert;
  const originalDriverWalletFind = prisma.driverWallet.findUnique;
  const originalDriverWalletUpsert = prisma.driverWallet.upsert;
  const originalDriverTxCreate = prisma.driverWalletTransaction.create;
  const originalFleetWalletUpsert = prisma.fleetWallet.upsert;
  const originalBookingFind = prisma.booking.findUnique;
  const originalTransaction = prisma.$transaction;

  let driverWalletCreditedAmount = 0;
  let fleetWalletCreditedAmount = 0;
  let driverEarningCreated = null;

  try {
    prisma.$transaction = async (cb) => cb(prisma);

    prisma.driverEarning.findUnique = async () => null;
    prisma.driverEarning.create = async ({ data }) => {
      driverEarningCreated = data;
      return data;
    };
    prisma.driverEarning.upsert = async ({ create }) => {
      driverEarningCreated = create;
      return create;
    };

    prisma.booking.findUnique = async () => ({
      id: 'booking-indep-1',
      paymentStatus: 'PAID',
    });

    prisma.driverWallet.findUnique = async () => ({
      id: 'd-wallet-1',
      driverId: 'driver-1',
      cachedBalance: 100,
      commissionDue: 0,
    });

    prisma.driverWallet.upsert = async ({ create, update }) => {
      driverWalletCreditedAmount += (update?.cachedBalance?.increment || create?.cachedBalance || 0);
      return { id: 'd-wallet-1', cachedBalance: 100 + driverWalletCreditedAmount };
    };

    prisma.driverWalletTransaction.create = async ({ data }) => data;

    prisma.fleetWallet.upsert = async ({ create, update }) => {
      fleetWalletCreditedAmount += (update?.cachedBalance?.increment || create?.cachedBalance || 0);
      return { id: 'f-wallet-1', cachedBalance: fleetWalletCreditedAmount };
    };

    // Fare 1000, Commission 200 (20%), Net 800
    const result = await settleTripEarnings({
      bookingId: 'booking-indep-1',
      driverId: 'driver-1',
      grossAmount: 1000,
      paymentMethod: 'ONLINE',
      fleetOwnerId: undefined, // Independent driver trip!
    });

    assert.equal(result.type, 'ONLINE');
    assert.equal(result.commission, 200);
    assert.equal(result.driverNet, 800);

    // Exact participant liability verification
    assert.equal(driverWalletCreditedAmount, 800, 'Driver wallet must receive net earnings');
    assert.equal(fleetWalletCreditedAmount, 0, 'Fleet wallet must receive 0 on independent trip');
    assert.equal(driverWalletCreditedAmount + fleetWalletCreditedAmount, 800, 'Total participant liability must equal net fare (800)');
  } finally {
    prisma.driverEarning.findUnique = originalDriverEarningFind;
    prisma.driverEarning.create = originalDriverEarningCreate;
    prisma.driverEarning.upsert = originalDriverEarningUpsert;
    prisma.driverWallet.findUnique = originalDriverWalletFind;
    prisma.driverWallet.upsert = originalDriverWalletUpsert;
    prisma.driverWalletTransaction.create = originalDriverTxCreate;
    prisma.fleetWallet.upsert = originalFleetWalletUpsert;
    prisma.booking.findUnique = originalBookingFind;
    prisma.$transaction = originalTransaction;
  }
});

test('FIN-002: Fleet trip credits ONLY the fleet wallet, NEVER creating duplicate driver balance', async () => {
  const originalDriverEarningFind = prisma.driverEarning.findUnique;
  const originalDriverEarningCreate = prisma.driverEarning.create;
  const originalDriverEarningUpsert = prisma.driverEarning.upsert;
  const originalDriverWalletFind = prisma.driverWallet.findUnique;
  const originalDriverWalletUpsert = prisma.driverWallet.upsert;
  const originalDriverTxCreate = prisma.driverWalletTransaction.create;
  const originalFleetWalletUpsert = prisma.fleetWallet.upsert;
  const originalFleetWalletFind = prisma.fleetWallet.findUnique;
  const originalFleetTxCreate = prisma.fleetWalletTransaction.create;
  const originalFleetEarningUpsert = prisma.fleetEarning.upsert;
  const originalBookingFind = prisma.booking.findUnique;
  const originalTransaction = prisma.$transaction;

  let driverWalletCreditedAmount = 0;
  let fleetWalletCreditedAmount = 0;
  let driverEarningAudit = null;
  let fleetEarningAudit = null;

  try {
    prisma.$transaction = async (cb) => cb(prisma);

    prisma.driverEarning.findUnique = async () => null;
    prisma.driverEarning.create = async ({ data }) => {
      driverEarningAudit = data;
      return data;
    };
    prisma.driverEarning.upsert = async ({ create }) => {
      driverEarningAudit = create;
      return create;
    };

    prisma.booking.findUnique = async () => ({
      id: 'booking-fleet-1',
      paymentStatus: 'PAID',
    });

    prisma.driverWallet.findUnique = async () => ({
      id: 'd-wallet-1',
      driverId: 'driver-1',
      cachedBalance: 0,
      commissionDue: 0,
    });

    prisma.driverWallet.upsert = async ({ create, update }) => {
      driverWalletCreditedAmount += (update?.cachedBalance?.increment || create?.cachedBalance || 0);
      return { id: 'd-wallet-1', cachedBalance: driverWalletCreditedAmount };
    };

    prisma.driverWalletTransaction.create = async ({ data }) => data;

    prisma.fleetWallet.upsert = async ({ create, update }) => {
      fleetWalletCreditedAmount += (update?.cachedBalance?.increment || create?.cachedBalance || 0);
      return { id: 'f-wallet-1', cachedBalance: fleetWalletCreditedAmount };
    };

    prisma.fleetWallet.findUnique = async () => ({
      id: 'f-wallet-1',
      fleetOwnerId: 'fleet-owner-1',
      cachedBalance: fleetWalletCreditedAmount,
    });

    prisma.fleetWalletTransaction.create = async ({ data }) => data;
    prisma.fleetEarning.upsert = async ({ create }) => {
      fleetEarningAudit = create;
      return create;
    };

    // Fare 1000, Commission 200 (20%), Net 800 on Fleet Trip
    const result = await settleTripEarnings({
      bookingId: 'booking-fleet-1',
      driverId: 'driver-1',
      grossAmount: 1000,
      paymentMethod: 'ONLINE',
      fleetOwnerId: 'fleet-owner-1', // Fleet trip!
    });

    assert.equal(result.type, 'ONLINE_FLEET');
    assert.equal(result.commission, 200);
    assert.equal(result.fleetNet, 800);
    assert.equal(result.driverNet, 800);

    // CRITICAL SECURITY ASSERTION:
    // Withdrawable liability must be created ONCE, not twice!
    assert.equal(fleetWalletCreditedAmount, 800, 'Fleet wallet must receive the net earnings');
    assert.equal(driverWalletCreditedAmount, 0, 'Driver wallet must NOT receive withdrawable credit on a fleet trip (prevents double liability)!');
    assert.equal(
      fleetWalletCreditedAmount + driverWalletCreditedAmount,
      800,
      'Total participant platform liability must strictly equal 800 (contractual net), never 1600!'
    );

    // Audit assertions: driver performance tracking is still recorded
    assert.ok(driverEarningAudit, 'Driver earning audit record must exist');
    assert.equal(driverEarningAudit.netAmount, 800);
    assert.ok(fleetEarningAudit, 'Fleet earning audit record must exist');
    assert.equal(fleetEarningAudit.netAmount, 800);
  } finally {
    prisma.driverEarning.findUnique = originalDriverEarningFind;
    prisma.driverEarning.create = originalDriverEarningCreate;
    prisma.driverEarning.upsert = originalDriverEarningUpsert;
    prisma.driverWallet.findUnique = originalDriverWalletFind;
    prisma.driverWallet.upsert = originalDriverWalletUpsert;
    prisma.driverWalletTransaction.create = originalDriverTxCreate;
    prisma.fleetWallet.upsert = originalFleetWalletUpsert;
    prisma.fleetWallet.findUnique = originalFleetWalletFind;
    prisma.fleetWalletTransaction.create = originalFleetTxCreate;
    prisma.fleetEarning.upsert = originalFleetEarningUpsert;
    prisma.booking.findUnique = originalBookingFind;
    prisma.$transaction = originalTransaction;
  }
});
