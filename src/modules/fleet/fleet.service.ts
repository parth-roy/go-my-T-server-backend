import { prisma } from '@shared/db/prisma';
/**
 * fleet.service.ts — Business Logic for Fleet & ULIP Verification
 *
 * Responsibilities:
 *  1. Driver profile registration & retrieval
 *  2. Vehicle registration
 *  3. ULIP SARATHI (DL) verification — calls sarathi.service.ts
 *  4. ULIP VAHAN (RC) verification — calls vahan.service.ts
 *  5. Writes VerificationLog for every government API call (legal audit trail)
 *  6. Updates Driver/Vehicle verification status based on ULIP result
 *  7. Online/Offline status management
 *
 * RULE: Business logic lives here. Controllers are thin.
 * RULE: Never call ULIP directly from here — use sarathi.service / vahan.service.
 * RULE: Never delete VerificationLog rows — it's a legal audit trail.
 */

import { PrismaClient, UlipVerifStatus } from '@prisma/client';
import { AppError } from '@shared/errors/AppError';
import { env } from '@config/env';
import { logger } from '@shared/logger';
import { verifyDriverWithSarathi } from './sarathi.service';
import { verifyVehicleWithVahan } from './vahan.service';
import type {
  RegisterDriverInput,
  RegisterVehicleInput,
  VerifyLicenseInput,
  VerifyVehicleRcInput,
  UpdateDriverStatusInput,
  OnboardingDocumentsInput,
  DocumentItemInput,
  UpdateProfileInfoInput,
} from './fleet.schema';


// ── Driver Profile ────────────────────────────────────────────────────

/**
 * Creates a Driver profile linked to an existing User.
 * A User can only have one Driver profile.
 */
export async function registerDriver(
  userId: string,
  input: RegisterDriverInput
): Promise<object> {
  // Guard: if already registered, just update user and return existing driver
  const existing = await prisma.driver.findUnique({ where: { userId } });
  if (existing) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        language: input.language,
        profileImageUrl: input.profileImageUrl,
      },
    });
    logger.info('[Fleet] Driver profile already exists, updated user info', { userId, driverId: existing.id });
    return _formatDriverProfile(existing);
  }

  // Update user name/language if provided, then create driver record
  const [, driver] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        language: input.language,
        profileImageUrl: input.profileImageUrl,
      },
    }),
    prisma.driver.create({
      data: {
        userId,
        licenseNumber: `PENDING_${userId}`, // placeholder until DL verification
      },
    }),
  ]);

  logger.info('[Fleet] Driver profile created', { userId, driverId: driver.id });
  return _formatDriverProfile(driver);
}

/**
 * Returns the driver profile for the authenticated user.
 */
export async function getMyDriverProfile(userId: string): Promise<object> {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: {
      vehicle: true,
      documents: { orderBy: { createdAt: 'desc' } },
      subscription: true,
    },
  });
  if (!driver) throw AppError.notFound('Driver profile not found. Please register first.');
  
  // --- Compute Dashboard Real-time Metrics ---
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfThisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  let todayEarnings = 0;
  let yesterdayEarnings = 0;
  let weeklyEarnings = 0;
  let lastWeekEarnings = 0;

  const wallet = await prisma.driverWallet.findUnique({ where: { driverId: driver.id } });
  if (wallet) {
    const txns = await prisma.driverWalletTransaction.findMany({
      where: {
        walletId: wallet.id,
        type: 'CREDIT',
        reason: 'TRIP_EARNING',
        createdAt: { gte: startOfLastWeek },
      },
      select: { amount: true, createdAt: true },
    });

    for (const tx of txns) {
      if (tx.createdAt >= startOfThisWeek) {
        weeklyEarnings += tx.amount;
      } else {
        lastWeekEarnings += tx.amount;
      }

      if (tx.createdAt >= startOfToday) {
        todayEarnings += tx.amount;
      } else if (tx.createdAt >= startOfYesterday) {
        yesterdayEarnings += tx.amount;
      }
    }
  }

  const todayTrips = await prisma.booking.count({
    where: {
      driverId: driver.id,
      status: 'COMPLETED',
      createdAt: { gte: startOfToday },
    },
  });

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    const trend = ((current - previous) / previous) * 100;
    return Math.min(Math.max(trend, -100), 100); // Cap at -100% and +100%
  };

  const sub = driver.subscription;
  const isPremium = Boolean(sub && sub.isActive && new Date(sub.endDate) > now);
  const daysRemaining = isPremium
    ? Math.max(0, Math.ceil((new Date(sub!.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const profile = _formatDriverProfile(driver);
  return {
    ...profile,
    isPremium,
    daysRemaining,
    driverMembership: isPremium ? {
      plan: sub!.plan,
      startDate: sub!.startDate,
      endDate: sub!.endDate,
      daysRemaining,
    } : null,
    todayEarnings,
    todayTrips,
    weeklyEarnings,
    todayTrend: calculateTrend(todayEarnings, yesterdayEarnings),
    weeklyTrend: calculateTrend(weeklyEarnings, lastWeekEarnings),
  };
}

// ── Vehicle ───────────────────────────────────────────────────────────

/**
 * Registers a vehicle for the driver.
 * A driver can only have one vehicle.
 */
export async function registerVehicle(
  userId: string,
  input: RegisterVehicleInput
): Promise<object> {
  const driver = await _requireDriver(userId);

  if (driver.vehicleId) {
    // If the new registration number differs, ensure it's not taken by another driver
    if (input.registrationNo !== driver.vehicle?.registrationNo) {
      const existing = await prisma.vehicle.findUnique({
        where: { registrationNo: input.registrationNo },
      });
      if (existing) {
        throw AppError.conflict(
          `Vehicle "${input.registrationNo}" is already registered in the system`,
          'VEHICLE_REG_NO_TAKEN'
        );
      }
    }

    // Update the existing vehicle instead of blocking
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: driver.vehicleId },
      data: {
        registrationNo: input.registrationNo,
        type: input.type as any,
        make: input.make,
        model: input.model,
        year: input.year,
        color: input.color,
        capacityKg: input.capacityKg,
        rcVerifStatus: 'PENDING', // Reset verification status
        rcVerifiedAt: null,
      },
    });

    logger.info('[Fleet] Vehicle updated', {
      driverId: driver.id,
      vehicleId: updatedVehicle.id,
      registrationNo: updatedVehicle.registrationNo,
    });

    return updatedVehicle;
  }

  // registrationNo already sanitized by Zod transform
  const existing = await prisma.vehicle.findUnique({
    where: { registrationNo: input.registrationNo },
  });
  if (existing) {
    throw AppError.conflict(
      `Vehicle "${input.registrationNo}" is already registered in the system`,
      'VEHICLE_REG_NO_TAKEN'
    );
  }

  const [vehicle] = await prisma.$transaction([
    prisma.vehicle.create({
      data: {
        registrationNo: input.registrationNo,
        type: input.type as any,
        make: input.make,
        model: input.model,
        year: input.year,
        color: input.color,
        capacityKg: input.capacityKg,
      },
    }),
  ]);

  // Link vehicle to driver
  await prisma.driver.update({
    where: { id: driver.id },
    data: { vehicleId: vehicle.id },
  });

  logger.info('[Fleet] Vehicle registered', {
    driverId: driver.id,
    vehicleId: vehicle.id,
    registrationNo: vehicle.registrationNo,
  });

  return vehicle;
}

// ── ULIP: DL Verification (SARATHI / AUTHAPI/03) ──────────────────────

/**
 * Verifies the driver's DL via ULIP SARATHI.
 * Stores raw ULIP response in VerificationLog (immutable audit trail).
 * Updates driver.dlVerifStatus based on result.
 */
export async function verifyDriverLicense(
  userId: string,
  input: VerifyLicenseInput
): Promise<object> {
  const driver = await _requireDriver(userId);

  // Check if DL is already used by someone else
  const existingDl = await prisma.driver.findFirst({
    where: { licenseNumber: input.dlNumber, id: { not: driver.id } },
  });
  if (existingDl) {
    throw AppError.conflict(
      'This Driving License number is already registered to another account. Please use a different one for testing.',
      'DL_ALREADY_REGISTERED'
    );
  }

  // ── MOCK MODE (ULIP IP not yet whitelisted) ────────────────────────
  // Set MOCK_ULIP=true in .env to bypass the government API during development.
  // Flip to false once ULIP support whitelists the server IP.
  if (env.MOCK_ULIP === 'true') {
    logger.warn('[Fleet] ⚠️  MOCK_ULIP=true — Skipping SARATHI API, returning fake VERIFIED result', { driverId: driver.id });
    const ulipStatus = UlipVerifStatus.VERIFIED;
    await prisma.$transaction([
      prisma.driver.update({
        where: { id: driver.id },
        data: {
          dlNumber: input.dlNumber,
          dob: new Date(input.dob),
          permitTypes: input.permit,
          dlVerifStatus: ulipStatus,
          dlVerifiedAt: new Date(),
          dlUlipRawResponse: { mock: true, note: 'MOCK_ULIP mode — real API not called' } as any,
          licenseNumber: input.dlNumber,
        },
      }),
      prisma.verificationLog.create({
        data: {
          entityType: 'driver',
          entityId: driver.id,
          apiCalled: 'AUTHAPI/03-MOCK',
          requestBody: { dlnumber: input.dlNumber, dob: input.dob },
          response: { mock: true } as any,
          status: ulipStatus,
          calledBy: userId,
        },
      }),
    ]);
    return {
      status: ulipStatus,
      isVerified: true,
      requiresManualReview: false,
      message: '✅ [DEV MODE] Driving license mock-verified. Real verification will run once ULIP IP is whitelisted.',
      fields: {},
    };
  }
  // ── END MOCK MODE ──────────────────────────────────────────────────

  logger.info('[Fleet] Starting DL verification', {
    driverId: driver.id,
    dlNumber: input.dlNumber,
  });

  let result;
  try {
    result = await verifyDriverWithSarathi({
      dlnumber: input.dlNumber,
      dob: input.dob,
      driverName: input.driverName,
      permit: input.permit,
    });
  } catch (err: any) {
    logger.error('[Fleet] SARATHI API call failed', { err: err.message });
    throw AppError.internal(
      'Government verification service is temporarily unavailable. Please try again in a moment.'
    );
  }

  let ulipStatus: UlipVerifStatus;
  if (result.isNotInSarathi) {
    ulipStatus = UlipVerifStatus.MANUAL_REVIEW;
  } else if (result.isDriverVerified) {
    ulipStatus = UlipVerifStatus.VERIFIED;
  } else {
    ulipStatus = UlipVerifStatus.FAILED;
  }

  await prisma.$transaction([
    prisma.driver.update({
      where: { id: driver.id },
      data: {
        dlNumber: input.dlNumber,
        dob: new Date(input.dob),
        permitTypes: input.permit,
        dlVerifStatus: ulipStatus,
        dlVerifiedAt: ulipStatus === UlipVerifStatus.VERIFIED ? new Date() : null,
        dlUlipRawResponse: result.rawResponse as any,
        licenseNumber: input.dlNumber,
      },
    }),
    prisma.verificationLog.create({
      data: {
        entityType: 'driver',
        entityId: driver.id,
        apiCalled: 'AUTHAPI/03',
        requestBody: {
          dlnumber: input.dlNumber,
          dob: input.dob,
          driverName: input.driverName,
          permit: input.permit,
        },
        response: result.rawResponse as any,
        status: ulipStatus,
        calledBy: userId,
      },
    }),
  ]);

  logger.info('[Fleet] DL verification complete', {
    driverId: driver.id,
    status: ulipStatus,
  });

  return {
    status: ulipStatus,
    isVerified: ulipStatus === UlipVerifStatus.VERIFIED,
    requiresManualReview: ulipStatus === UlipVerifStatus.MANUAL_REVIEW,
    message: _getDlStatusMessage(ulipStatus),
    fields: result.fields,
  };
}

// ── ULIP: RC Verification (VAHAN / AUTHAPI/02) ────────────────────────

/**
 * Verifies the driver's vehicle RC via ULIP VAHAN.
 * Stores raw ULIP response in VerificationLog.
 * Updates vehicle.rcVerifStatus based on result.
 */
export async function verifyVehicleRc(
  userId: string,
  input: VerifyVehicleRcInput
): Promise<object> {
  const driver = await _requireDriver(userId);

  if (!driver.vehicleId) {
    throw AppError.badRequest(
      'Please register your vehicle before verifying its RC',
      'NO_VEHICLE_REGISTERED'
    );
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
  });
  if (!vehicle || vehicle.id !== driver.vehicleId) {
    throw AppError.forbidden('This vehicle does not belong to your profile');
  }

  // ── MOCK MODE (ULIP IP not yet whitelisted) ────────────────────────
  if (env.MOCK_ULIP === 'true') {
    logger.warn('[Fleet] ⚠️  MOCK_ULIP=true — Skipping VAHAN API, returning fake VERIFIED result', { vehicleId: vehicle.id });
    const ulipStatus = UlipVerifStatus.VERIFIED;
    await prisma.$transaction([
      prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          ownerName: input.ownerName,
          chassisNumber: input.chassisNumber,
          engineNumber: input.engineNumber,
          rcVerifStatus: ulipStatus,
          rcVerifiedAt: new Date(),
          rcUlipRawResponse: { mock: true, note: 'MOCK_ULIP mode — real API not called' } as any,
        },
      }),
      // Mark onboarding complete — the router guard checks this field
      prisma.user.update({
        where: { id: userId },
        data: { profileComplete: true },
      }),
      prisma.verificationLog.create({
        data: {
          entityType: 'vehicle',
          entityId: vehicle.id,
          apiCalled: 'AUTHAPI/02-MOCK',
          requestBody: { vehiclenumber: vehicle.registrationNo },
          response: { mock: true } as any,
          status: ulipStatus,
          calledBy: userId,
        },
      }),
    ]);
    logger.info('[Fleet] User profileComplete set to true after RC mock-verification', { userId });
    return {
      status: ulipStatus,
      isVerified: true,
      isNotFound: false,
      message: '✅ [DEV MODE] Vehicle RC mock-verified. Real verification will run once ULIP IP is whitelisted.',
      fields: {},
    };
  }
  // ── END MOCK MODE ──────────────────────────────────────────────────

  logger.info('[Fleet] Starting RC verification', {
    driverId: driver.id,
    vehicleId: vehicle.id,
    registrationNo: vehicle.registrationNo,
  });

  let result;
  try {
    result = await verifyVehicleWithVahan({
      vehiclenumber: vehicle.registrationNo,
      ownerName: input.ownerName,
      chassisNumber: input.chassisNumber,
      engineNumber: input.engineNumber,
    });
  } catch (err: any) {
    logger.error('[Fleet] VAHAN API call failed', { err: err.message });
    throw AppError.internal(
      'Government verification service is temporarily unavailable. Please try again in a moment.'
    );
  }

  let ulipStatus: UlipVerifStatus;
  if (result.isNotFound) {
    ulipStatus = UlipVerifStatus.FAILED;
  } else if (result.isVerified) {
    ulipStatus = UlipVerifStatus.VERIFIED;
  } else {
    ulipStatus = UlipVerifStatus.FAILED;
  }

  await prisma.$transaction([
    prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        ownerName: input.ownerName,
        chassisNumber: input.chassisNumber,
        engineNumber: input.engineNumber,
        rcVerifStatus: ulipStatus,
        rcVerifiedAt: ulipStatus === UlipVerifStatus.VERIFIED ? new Date() : null,
        rcUlipRawResponse: result.rawResponse as any,
      },
    }),
    // Mark user onboarding complete on successful verification
    ...(ulipStatus === UlipVerifStatus.VERIFIED ? [
      prisma.user.update({
        where: { id: userId },
        data: { profileComplete: true },
      }),
    ] : []),
    prisma.verificationLog.create({
      data: {
        entityType: 'vehicle',
        entityId: vehicle.id,
        apiCalled: 'AUTHAPI/02',
        requestBody: {
          vehiclenumber: vehicle.registrationNo,
          ownerName: input.ownerName,
          chassisNumber: input.chassisNumber,
          engineNumber: input.engineNumber,
        },
        response: result.rawResponse as any,
        status: ulipStatus,
        calledBy: userId,
      },
    }),
  ]);

  logger.info('[Fleet] RC verification complete', {
    vehicleId: vehicle.id,
    status: ulipStatus,
  });

  return {
    status: ulipStatus,
    isVerified: ulipStatus === UlipVerifStatus.VERIFIED,
    isNotFound: result.isNotFound,
    message: _getRcStatusMessage(ulipStatus, result.isNotFound),
    fields: result.fields,
  };
}

// ── Driver Online Status ──────────────────────────────────────────────

/**
 * Allows a verified, doc-approved driver to toggle ONLINE (AVAILABLE) or OFFLINE.
 * Drivers cannot set ON_TRIP or BREAK — only the dispatch system does that.
 */
export async function updateDriverStatus(
  userId: string,
  input: UpdateDriverStatusInput
): Promise<object> {
  const driver = await _requireDriver(userId);

  // Guard: docs must be approved before going online
  if (input.status === 'AVAILABLE' && !driver.isDocVerified) {
    throw AppError.badRequest(
      'Your documents are still being reviewed. You will be notified by the Parther team once approved.',
      'DOCS_NOT_VERIFIED'
    );
  }

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: { status: input.status as any },
  });

  logger.info('[Fleet] Driver status updated', {
    driverId: driver.id,
    status: input.status,
  });

  return { status: updated.status };
}

// ── Private helpers ───────────────────────────────────────────────────

async function _requireDriver(userId: string) {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: { vehicle: true },
  });
  if (!driver) {
    throw AppError.notFound(
      'Driver profile not found. Please complete registration first.'
    );
  }
  return driver;
}

function _formatDriverProfile(driver: any) {
  // Never expose raw ULIP response to the client (contains government data)
  const { dlUlipRawResponse: _dl, ...rest } = driver;
  return rest;
}

function _getDlStatusMessage(status: UlipVerifStatus): string {
  switch (status) {
    case UlipVerifStatus.VERIFIED:
      return '✅ Driving license verified successfully via government records.';
    case UlipVerifStatus.FAILED:
      return '❌ Verification failed. Please check your DL number, date of birth, and name — they must match exactly as on your license.';
    case UlipVerifStatus.MANUAL_REVIEW:
      return '🔍 Your license could not be found in the government digital database. It will be verified manually by the Parther team within 1–2 business days.';
    default:
      return 'Verification pending.';
  }
}

function _getRcStatusMessage(status: UlipVerifStatus, isNotFound: boolean): string {
  if (isNotFound)
    return '❌ Vehicle registration number not found in VAHAN. Ensure the number is correct, or the vehicle may be unregistered.';
  switch (status) {
    case UlipVerifStatus.VERIFIED:
      return '✅ Vehicle RC verified successfully via government records.';
    case UlipVerifStatus.FAILED:
      return '❌ RC verification failed. Owner name, chassis number, or engine number does not match VAHAN records. Please recheck.';
    default:
      return 'Verification pending.';
  }
}

// ── Admin Override ────────────────────────────────────────────────────────

/**
 * P3-4: Manually override a driver's verification status (ADMIN ONLY).
 * Useful when ULIP APIs are down, or manual offline verification is done.
 */
export async function adminOverrideVerification(
  adminId: string,
  driverId: string,
  notes?: string
): Promise<object> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw AppError.notFound('Driver not found');
  }

  // Update Driver status to VERIFIED
  const updatedDriver = await prisma.driver.update({
    where: { id: driverId },
    data: {
      dlVerifStatus: UlipVerifStatus.VERIFIED,
    },
  });

  // Write to VerificationLog to track WHO overrode it
  await prisma.verificationLog.create({
    data: {
      entityType: 'driver',
      entityId: driverId,
      apiCalled: 'MANUAL_OVERRIDE',
      requestBody: { adminId, driverId, notes: notes || 'No notes provided' },
      response: { status: 'SUCCESS', action: 'MANUAL_OVERRIDE' },
      status: UlipVerifStatus.VERIFIED,
      calledBy: adminId,
    },
  });

  logger.info(`[Admin] Driver ${driverId} verification manually overridden by admin ${adminId}. Notes: ${notes}`);

  return _formatDriverProfile(updatedDriver);
}

// ── Manual Onboarding & Verification ──────────────────────────────────────────

async function _getOrCreateDriver(userId: string) {
  let driver = await prisma.driver.findUnique({
    where: { userId },
    include: { vehicle: true },
  });
  if (!driver) {
    driver = await prisma.driver.create({
      data: {
        userId,
        licenseNumber: `PENDING_${userId}`,
      },
      include: { vehicle: true },
    });
    logger.info('[Fleet] Auto-created driver profile for onboarding', { userId, driverId: driver.id });
  }
  return driver;
}

/**
 * Uploads or updates onboarding documents for the authenticated driver.
 * Supports single document or array of documents.
 * Updates DL / RC numbers on Driver and Vehicle if provided.
 */
export async function uploadOnboardingDocuments(
  userId: string,
  input: OnboardingDocumentsInput
): Promise<object> {
  const driver = await _getOrCreateDriver(userId);

  let docList: DocumentItemInput[] = [];
  if (Array.isArray(input)) {
    docList = input;
  } else if ('documents' in input && Array.isArray(input.documents)) {
    docList = input.documents;
  } else {
    docList = [input as DocumentItemInput];
  }

  const savedDocuments = [];

  for (const doc of docList) {
    const existingDoc = await prisma.driverDocument.findFirst({
      where: {
        driverId: driver.id,
        type: doc.type,
      },
    });

    let savedDoc;
    if (existingDoc) {
      savedDoc = await prisma.driverDocument.update({
        where: { id: existingDoc.id },
        data: {
          fileUrl: doc.fileUrl,
          status: 'PENDING',
          rejectedReason: null,
          verifiedAt: null,
        },
      });
    } else {
      savedDoc = await prisma.driverDocument.create({
        data: {
          driverId: driver.id,
          type: doc.type,
          fileUrl: doc.fileUrl,
          status: 'PENDING',
        },
      });
    }
    savedDocuments.push(savedDoc);

    const upperType = doc.type.toUpperCase();

    // If document type is DL_FRONT or DRIVING_LICENSE and docNumber is provided:
    if ((upperType === 'DL_FRONT' || upperType === 'DRIVING_LICENSE') && doc.docNumber) {
      const dlNum = doc.docNumber.trim().toUpperCase();
      const conflict = await prisma.driver.findFirst({
        where: { licenseNumber: dlNum, id: { not: driver.id } },
      });
      if (conflict) {
        throw AppError.conflict(
          'This Driving License number is already registered to another account.',
          'DL_ALREADY_REGISTERED'
        );
      }
      await prisma.driver.update({
        where: { id: driver.id },
        data: {
          licenseNumber: dlNum,
          dlNumber: dlNum,
        },
      });
    }

    // If document type is RC_FRONT or VEHICLE_RC and docNumber is provided:
    if ((upperType === 'RC_FRONT' || upperType === 'VEHICLE_RC') && doc.docNumber) {
      const currentDriver = await prisma.driver.findUnique({
        where: { id: driver.id },
        include: { vehicle: true },
      });
      const regNo = doc.docNumber.toUpperCase().replace(/[\s-]/g, '');
      const metaVehicleType = doc.meta?.vehicleType || 'TATA_ACE';

      if (currentDriver?.vehicleId) {
        const conflictVehicle = await prisma.vehicle.findFirst({
          where: { registrationNo: regNo, id: { not: currentDriver.vehicleId } },
        });
        if (conflictVehicle) {
          throw AppError.conflict(
            `Vehicle "${regNo}" is already registered in the system`,
            'VEHICLE_REG_NO_TAKEN'
          );
        }
        await prisma.vehicle.update({
          where: { id: currentDriver.vehicleId },
          data: {
            registrationNo: regNo,
            ...(doc.meta?.vehicleType ? { type: metaVehicleType as any } : {}),
          },
        });
      } else {
        const existingVehicle = await prisma.vehicle.findUnique({
          where: { registrationNo: regNo },
        });
        if (existingVehicle) {
          await prisma.driver.update({
            where: { id: driver.id },
            data: { vehicleId: existingVehicle.id },
          });
        } else {
          const newVehicle = await prisma.vehicle.create({
            data: {
              registrationNo: regNo,
              type: metaVehicleType as any,
              make: 'Commercial',
              model: metaVehicleType,
              year: new Date().getFullYear(),
              capacityKg: 750,
            },
          });
          await prisma.driver.update({
            where: { id: driver.id },
            data: { vehicleId: newVehicle.id },
          });
        }
      }
    }
  }

  const updatedDriver = await prisma.driver.findUnique({
    where: { id: driver.id },
    include: {
      vehicle: true,
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });

  return {
    documents: updatedDriver?.documents ?? savedDocuments,
    driver: updatedDriver ? _formatDriverProfile(updatedDriver) : null,
    vehicle: updatedDriver?.vehicle ?? null,
  };
}

/**
 * Returns current onboarding status, documents, vehicle, driver profile, and user info.
 */
export async function getOnboardingStatus(userId: string): Promise<object> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      profileImageUrl: true,
      profileComplete: true,
    },
  });
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: {
      vehicle: true,
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });

  const formattedDob = driver?.dob ? driver.dob.toISOString().split('T')[0] : null;

  return {
    isDocVerified: driver?.isDocVerified ?? false,
    profileComplete: user.profileComplete,
    documents: driver?.documents ?? [],
    vehicle: driver?.vehicle ?? null,
    driver: driver ? _formatDriverProfile(driver) : null,
    user: {
      name: user.name ?? null,
      phone: user.phone ?? null,
      dob: formattedDob,
      gender: null,
      profileImage: user.profileImageUrl ?? null,
    },
  };
}

/**
 * Updates user and driver profile information.
 */
export async function updateProfileInfo(
  userId: string,
  input: UpdateProfileInfoInput
): Promise<object> {
  const driver = await _getOrCreateDriver(userId);

  const userUpdateData: any = {};
  if (input.name !== undefined) userUpdateData.name = input.name;
  if (input.profileImageUrl !== undefined) {
    userUpdateData.profileImageUrl = input.profileImageUrl || null;
  }
  if (input.whatsappUpdates !== undefined) {
    userUpdateData.whatsappOptIn = input.whatsappUpdates;
  }

  const driverUpdateData: any = {};
  if (input.dob) {
    const parsedDob = new Date(input.dob);
    if (!isNaN(parsedDob.getTime())) {
      driverUpdateData.dob = parsedDob;
    }
  }

  const [updatedUser, updatedDriver] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: userUpdateData,
      select: {
        id: true,
        name: true,
        phone: true,
        profileImageUrl: true,
        profileComplete: true,
        whatsappOptIn: true,
      },
    }),
    prisma.driver.update({
      where: { id: driver.id },
      data: driverUpdateData,
      include: {
        vehicle: true,
        documents: { orderBy: { createdAt: 'desc' } },
      },
    }),
  ]);

  const formattedDob = updatedDriver.dob ? updatedDriver.dob.toISOString().split('T')[0] : null;

  return {
    user: {
      name: updatedUser.name ?? null,
      phone: updatedUser.phone ?? null,
      dob: formattedDob,
      gender: input.gender ?? null,
      profileImage: updatedUser.profileImageUrl ?? null,
      profileImageUrl: updatedUser.profileImageUrl ?? null,
      whatsappUpdates: updatedUser.whatsappOptIn,
      profileComplete: updatedUser.profileComplete,
    },
    driver: _formatDriverProfile(updatedDriver),
    vehicle: updatedDriver.vehicle ?? null,
  };
}
