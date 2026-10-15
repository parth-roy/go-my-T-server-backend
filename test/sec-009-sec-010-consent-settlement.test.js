const test = require('node:test');
const assert = require('node:assert/strict');

// Modules under test
const { markPickedUp, getBooking, completeBooking } = require('../dist/modules/booking/booking.service');
const { completeJob } = require('../dist/modules/workforce/workforce.service');
const { getUserConversations, getConversationMessages } = require('../dist/modules/workforce/workforce.chat.service');
const { addFleetDriver } = require('../dist/modules/fleet-owner/fleet-owner.service');
const { prisma } = require('../dist/shared/db/prisma');
const driverWalletService = require('../dist/modules/driver-wallet/driver-wallet.service');

// ─────────────────────────────────────────────────────────────────────────────
// SEC-009: PICKUP VERIFICATION & SECRETS PRIVACY
// ─────────────────────────────────────────────────────────────────────────────

test('SEC-009: markPickedUp rejects execution when OTP is omitted', async () => {
  await assert.rejects(
    async () => {
      await markPickedUp('booking-123', 'driver-user-1');
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'OTP_REQUIRED');
      assert.match(err.message, /Pickup verification requires customer OTP/i);
      return true;
    }
  );
});

test('SEC-009: markPickedUp rejects invalid OTP against stored pickupOtp', async () => {
  const originalDriverFind = prisma.driver.findUnique;
  const originalBookingFind = prisma.booking.findFirst;

  try {
    prisma.driver.findUnique = async () => ({ id: 'driver-1', userId: 'driver-user-1' });
    prisma.booking.findFirst = async () => ({
      id: 'booking-123',
      driverId: 'driver-1',
      status: 'DRIVER_ARRIVING',
      pickupOtp: '4567',
    });

    await assert.rejects(
      async () => {
        await markPickedUp('booking-123', 'driver-user-1', '0000');
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'INVALID_OTP');
        assert.match(err.message, /Invalid OTP/i);
        return true;
      }
    );
  } finally {
    prisma.driver.findUnique = originalDriverFind;
    prisma.booking.findFirst = originalBookingFind;
  }
});

test('SEC-009: markPickedUp transitions successfully when correct OTP is supplied', async () => {
  const originalDriverFind = prisma.driver.findUnique;
  const originalBookingFind = prisma.booking.findFirst;
  const originalBookingUpdate = prisma.booking.update;
  const originalUserFind = prisma.user.findUnique;
  const originalPricing = prisma.vehicleTypePricing?.findUnique;
  const originalNotif = prisma.userNotification?.create;

  try {
    prisma.driver.findUnique = async () => ({ id: 'driver-1', userId: 'driver-user-1' });
    prisma.booking.findFirst = async () => ({
      id: 'booking-123',
      driverId: 'driver-1',
      status: 'DRIVER_ARRIVING',
      customerId: 'cust-1',
      pickupOtp: '4567',
      arrivalTime: new Date(),
    });

    let updatedData = null;
    prisma.booking.update = async ({ data }) => {
      updatedData = data;
      return { id: 'booking-123', status: data.status, customerId: 'cust-1' };
    };
    prisma.user.findUnique = async () => ({ id: 'cust-1', fcmToken: null });
    if (prisma.vehicleTypePricing) prisma.vehicleTypePricing.findUnique = async () => null;
    if (prisma.userNotification) prisma.userNotification.create = async () => ({ id: 'notif-1' });

    const result = await markPickedUp('booking-123', 'driver-user-1', '4567');
    assert.equal(result.status, 'PICKED_UP');
    assert.equal(updatedData.status, 'PICKED_UP');
    assert.equal(updatedData.pickupOtp, null); // Cleared upon consumption
  } finally {
    prisma.driver.findUnique = originalDriverFind;
    prisma.booking.findFirst = originalBookingFind;
    prisma.booking.update = originalBookingUpdate;
    prisma.user.findUnique = originalUserFind;
    if (prisma.vehicleTypePricing) prisma.vehicleTypePricing.findUnique = originalPricing;
    if (prisma.userNotification) prisma.userNotification.create = originalNotif;
  }
});

test('SEC-009: getBooking masks pickupOtp for DRIVER and FLEET_OWNER, preserves for CUSTOMER', async () => {
  const originalBookingFind = prisma.booking.findUnique;
  const originalDriverFind = prisma.driver.findUnique;
  const originalFleetFind = prisma.fleetOwner.findUnique;
  const originalAuditFind = prisma.pricingAuditLog.findFirst;

  try {
    prisma.booking.findUnique = async () => ({
      id: 'booking-123',
      customerId: 'cust-1',
      driverId: 'driver-1',
      status: 'DRIVER_ARRIVING',
      pickupOtp: '7890',
      stops: [],
      awardedFleetOwnerId: 'fleet-1',
    });
    prisma.driver.findUnique = async () => ({ id: 'driver-1', userId: 'driver-user-1' });
    prisma.fleetOwner.findUnique = async () => ({ id: 'fleet-1', userId: 'fleet-user-1' });
    prisma.pricingAuditLog.findFirst = async () => null;

    // Driver view -> pickupOtp must be masked
    const driverView = await getBooking('booking-123', 'driver-user-1', 'DRIVER');
    assert.equal(driverView.pickupOtp, null);

    // Fleet Owner view -> pickupOtp must be masked
    const fleetView = await getBooking('booking-123', 'fleet-user-1', 'FLEET_OWNER');
    assert.equal(fleetView.pickupOtp, null);

    // Customer view -> pickupOtp must be visible
    const customerView = await getBooking('booking-123', 'cust-1', 'CUSTOMER');
    assert.equal(customerView.pickupOtp, '7890');
  } finally {
    prisma.booking.findUnique = originalBookingFind;
    prisma.driver.findUnique = originalDriverFind;
    prisma.fleetOwner.findUnique = originalFleetFind;
    prisma.pricingAuditLog.findFirst = originalAuditFind;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-009: WORKFORCE COMPLETION OTP & CHAT PRIVACY
// ─────────────────────────────────────────────────────────────────────────────

test('SEC-009: completeJob rejects completion when OTP is missing or unrequested', async () => {
  const originalWorkerFind = prisma.worker.findUnique;
  const originalAssignmentFind = prisma.jobAssignment.findFirst;

  try {
    prisma.worker.findUnique = async () => ({ id: 'worker-1', userId: 'worker-user-1' });
    prisma.jobAssignment.findFirst = async () => ({
      id: 'assignment-1',
      workerId: 'worker-1',
      status: 'IN_PROGRESS',
      bookingId: 'booking-w-1',
      completionOtp: null, // Not yet requested
      payoutAmount: 500,
    });

    await assert.rejects(
      async () => {
        await completeJob('worker-user-1', 'assignment-1', {});
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'OTP_REQUIRED');
        return true;
      }
    );
  } finally {
    prisma.worker.findUnique = originalWorkerFind;
    prisma.jobAssignment.findFirst = originalAssignmentFind;
  }
});

test('SEC-009: completeJob rejects invalid or expired completion OTP', async () => {
  const originalWorkerFind = prisma.worker.findUnique;
  const originalAssignmentFind = prisma.jobAssignment.findFirst;

  try {
    prisma.worker.findUnique = async () => ({ id: 'worker-1', userId: 'worker-user-1' });

    // Case 1: Wrong OTP
    prisma.jobAssignment.findFirst = async () => ({
      id: 'assignment-1',
      workerId: 'worker-1',
      status: 'IN_PROGRESS',
      bookingId: 'booking-w-1',
      completionOtp: '4321',
      otpExpiresAt: new Date(Date.now() + 60000), // unexpired
      payoutAmount: 500,
    });

    await assert.rejects(
      async () => {
        await completeJob('worker-user-1', 'assignment-1', { otp: '0000' });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'INVALID_OTP');
        return true;
      }
    );

    // Case 2: Expired OTP
    prisma.jobAssignment.findFirst = async () => ({
      id: 'assignment-1',
      workerId: 'worker-1',
      status: 'IN_PROGRESS',
      bookingId: 'booking-w-1',
      completionOtp: '4321',
      otpExpiresAt: new Date(Date.now() - 60000), // expired 1 min ago
      payoutAmount: 500,
    });

    await assert.rejects(
      async () => {
        await completeJob('worker-user-1', 'assignment-1', { otp: '4321' });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'OTP_EXPIRED');
        return true;
      }
    );
  } finally {
    prisma.worker.findUnique = originalWorkerFind;
    prisma.jobAssignment.findFirst = originalAssignmentFind;
  }
});

test('SEC-009: workforce chat hides completionOtp from worker, reveals to hirer', async () => {
  const originalWorkerFind = prisma.worker.findUnique;
  const originalGigFindMany = prisma.gigJob.findMany;
  const originalGigFindUnique = prisma.gigJob.findUnique;
  const originalUserFind = prisma.user.findUnique;
  const originalGigCount = prisma.gigMessage?.count;
  const originalGigUpdateMany = prisma.gigMessage?.updateMany;
  const originalGigFindManyMsg = prisma.gigMessage?.findMany;

  try {
    prisma.worker.findUnique = async ({ where }) => {
      if (where.userId === 'worker-user-1') return { id: 'worker-1' };
      return null;
    };
    prisma.user.findUnique = async ({ where }) => {
      if (where.id === 'hirer-user-1') {
        return { id: 'hirer-user-1', name: 'Alice', phone: '456', profileImageUrl: null };
      }
      return null;
    };
    if (prisma.gigMessage) {
      prisma.gigMessage.count = async () => 0;
      prisma.gigMessage.updateMany = async () => ({ count: 0 });
      prisma.gigMessage.findMany = async () => [];
    }

    const mockGig = {
      id: 'gig-1',
      jobNumber: 'GIG-001',
      gigCategory: 'PLUMBING',
      status: 'IN_PROGRESS',
      completionOtp: '5678',
      locationAddress: 'Test St',
      scheduledSlot: 'Morning',
      customerId: 'hirer-user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      assignments: [{ worker: { id: 'worker-1', userId: 'worker-user-1', user: { id: 'worker-user-1', name: 'Bob', phone: '123', profileImageUrl: null } } }],
      customer: { id: 'hirer-user-1', name: 'Alice', phone: '456', profileImageUrl: null },
      messages: [],
    };

    prisma.gigJob.findMany = async () => [mockGig];
    prisma.gigJob.findUnique = async () => mockGig;

    // Worker calls getUserConversations -> completionOtp must be null
    const workerConvs = await getUserConversations('worker-user-1');
    assert.equal(workerConvs[0].completionOtp, null);

    // Hirer calls getUserConversations -> completionOtp must be visible
    const hirerConvs = await getUserConversations('hirer-user-1');
    assert.equal(hirerConvs[0].completionOtp, '5678');

    // Worker calls getConversationMessages -> completionOtp must be null
    const workerThread = await getConversationMessages('worker-user-1', 'gig-1');
    assert.equal(workerThread.gig.completionOtp, null);

    // Hirer calls getConversationMessages -> completionOtp must be visible
    const hirerThread = await getConversationMessages('hirer-user-1', 'gig-1');
    assert.equal(hirerThread.gig.completionOtp, '5678');
  } finally {
    prisma.worker.findUnique = originalWorkerFind;
    prisma.gigJob.findMany = originalGigFindMany;
    prisma.gigJob.findUnique = originalGigFindUnique;
    prisma.user.findUnique = originalUserFind;
    if (prisma.gigMessage) {
      prisma.gigMessage.count = originalGigCount;
      prisma.gigMessage.updateMany = originalGigUpdateMany;
      prisma.gigMessage.findMany = originalGigFindManyMsg;
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SEC-010: FLEET SETTLEMENT HIJACKING & UNILATERAL FLEET BINDING
// ─────────────────────────────────────────────────────────────────────────────

test('SEC-010: completeBooking routes settlement exclusively to awarded fleet owner, NOT arbitrary fleetDriver membership', async () => {
  const originalDriverFind = prisma.driver.findUnique;
  const originalBookingFind = prisma.booking.findFirst;
  const originalBookingUpdate = prisma.booking.update;
  const originalDriverUpdateMany = prisma.driver.updateMany;
  const originalFleetDriverFindFirst = prisma.fleetDriver.findFirst;
  const originalTruckAssignmentFind = prisma.truckAssignment.findUnique;
  const originalScratchFind = prisma.scratchCard?.findUnique;
  const originalTransaction = prisma.$transaction;
  const originalSettle = driverWalletService.settleTripEarnings;

  let settlementInputCaptured = null;
  driverWalletService.settleTripEarnings = async (input) => {
    settlementInputCaptured = input;
    return { success: true };
  };

  try {
    prisma.driver.findUnique = async () => ({ id: 'driver-1', userId: 'driver-user-1' });
    prisma.$transaction = async (cb) => cb(prisma);
    prisma.booking.updateMany = async () => ({ count: 1 });
    prisma.booking.findUnique = async ({ where }) => ({
      id: where?.id || 'booking-independent-1',
      bookingNumber: 'BK-100',
      grandTotal: 1000,
      totalFare: 1000,
      customerId: 'cust-1',
    });
    prisma.booking.update = async ({ data }) => ({
      id: 'booking-independent-1',
      bookingNumber: 'BK-100',
      grandTotal: 1000,
      totalFare: 1000,
      customerId: 'cust-1',
    });
    prisma.driver.updateMany = async () => ({ count: 1 });
    prisma.truckAssignment.findUnique = async () => null;
    if (prisma.scratchCard) {
      prisma.scratchCard.findUnique = async () => null;
      prisma.scratchCard.create = async () => null;
    }

    // Driver is in fleet X in the database!
    prisma.fleetDriver.findFirst = async () => ({ fleetOwnerId: 'unrelated-fleet-hijacker' });

    // CASE 1: Independent booking (awardedFleetOwnerId is null)
    prisma.booking.findFirst = async () => ({
      id: 'booking-independent-1',
      driverId: 'driver-1',
      status: 'DELIVERED',
      grandTotal: 1000,
      totalFare: 1000,
      paymentMethod: 'ONLINE',
      paymentStatus: 'PAID',
      awardedFleetOwnerId: null, // Independent driver trip!
    });

    await completeBooking('booking-independent-1', 'driver-user-1');

    assert.ok(settlementInputCaptured, 'settleTripEarnings must be called');
    assert.equal(settlementInputCaptured.driverId, 'driver-1');
    assert.equal(
      settlementInputCaptured.fleetOwnerId,
      undefined,
      'Fleet owner ID must be undefined for independent driver trip (cannot be hijacked by unrelated fleet)!'
    );

    // CASE 2: Fleet awarded booking (awarded to Fleet Y)
    settlementInputCaptured = null;
    prisma.booking.findFirst = async () => ({
      id: 'booking-fleet-1',
      driverId: 'driver-1',
      status: 'DELIVERED',
      grandTotal: 1500,
      totalFare: 1500,
      paymentMethod: 'ONLINE',
      paymentStatus: 'PAID',
      awardedFleetOwnerId: 'legitimate-awarded-fleet-y',
    });

    await completeBooking('booking-fleet-1', 'driver-user-1');

    assert.ok(settlementInputCaptured, 'settleTripEarnings must be called');
    assert.equal(settlementInputCaptured.driverId, 'driver-1');
    assert.equal(
      settlementInputCaptured.fleetOwnerId,
      'legitimate-awarded-fleet-y',
      'Fleet owner ID must strictly match the booking awarded fleet owner!'
    );
  } finally {
    prisma.driver.findUnique = originalDriverFind;
    prisma.booking.findFirst = originalBookingFind;
    prisma.booking.update = originalBookingUpdate;
    prisma.driver.updateMany = originalDriverUpdateMany;
    prisma.fleetDriver.findFirst = originalFleetDriverFindFirst;
    prisma.truckAssignment.findUnique = originalTruckAssignmentFind;
    if (prisma.scratchCard) {
      prisma.scratchCard.findUnique = originalScratchFind;
    }
    prisma.$transaction = originalTransaction;
    driverWalletService.settleTripEarnings = originalSettle;
  }
});

test('SEC-010: addFleetDriver rejects adding driver active in another fleet or having active trips', async () => {
  const originalFleetOwnerFind = prisma.fleetOwner.findUnique;
  const originalUserFind = prisma.user.findUnique;
  const originalFleetDriverFindFirst = prisma.fleetDriver.findFirst;
  const originalBookingCount = prisma.booking.count;

  try {
    prisma.fleetOwner.findUnique = async () => ({ id: 'fleet-owner-current', companyName: 'FastLogistics' });
    prisma.user.findUnique = async () => ({
      id: 'driver-user-1',
      phone: '9876543210',
      driver: { id: 'driver-1' },
    });

    // Case 1: Driver is already active in another fleet
    prisma.fleetDriver.findFirst = async () => ({
      id: 'fd-other',
      fleetOwnerId: 'rival-fleet',
      fleetOwner: { companyName: 'Rival Carriers' },
    });

    await assert.rejects(
      async () => {
        await addFleetDriver('user-current-owner', { phone: '9876543210' });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'DRIVER_ALREADY_IN_ANOTHER_FLEET');
        assert.match(err.message, /already an active member of another fleet/i);
        return true;
      }
    );

    // Case 2: Driver is not in another fleet, but has active independent trips
    prisma.fleetDriver.findFirst = async () => null;
    prisma.booking.count = async () => 2; // 2 active trips

    await assert.rejects(
      async () => {
        await addFleetDriver('user-current-owner', { phone: '9876543210' });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'DRIVER_HAS_ACTIVE_TRIPS');
        assert.match(err.message, /active independent trips in progress/i);
        return true;
      }
    );
  } finally {
    prisma.fleetOwner.findUnique = originalFleetOwnerFind;
    prisma.user.findUnique = originalUserFind;
    prisma.fleetDriver.findFirst = originalFleetDriverFindFirst;
    prisma.booking.count = originalBookingCount;
  }
});
