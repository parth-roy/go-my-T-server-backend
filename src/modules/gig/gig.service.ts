/**
 * gig.service.ts — GoMyTruck Gig/Workforce Job Service
 * Wired to Gig Pricing Engine v1 (West Bengal zone-aware)
 */

import crypto from 'crypto';
import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';
import { GigJobStatus, WorkerJobStatus, NotificationType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { getSocketInstance } from '@shared/socket/socket.instance';
import { logger } from '@shared/logger';
import { notificationService } from '@modules/notifications/notification.service';
import { createNotification } from '@modules/notifications/inapp.notification.service';
import { calculateGigFare, classifyZone } from './gig.pricing';
import type { GigFareRequest, GigSkill, GigUrgency } from './gig.pricing.types';
import { razorpay } from '../payment/razorpay.client';

// ─────────────────────────────────────────────
// HELPERS — read GigPricingConfig from DB
// ─────────────────────────────────────────────

async function getGigConfig(): Promise<{
  festivalSurge: boolean;
  rainSurge: boolean;
  platformCommissionRate: number;
  travelFeePerKmBeyond5: number;
}> {
  try {
    const rows = await (prisma as any).gigPricingConfig.findMany() as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      festivalSurge:          map['gig_festival_surge_active'] === 'true',
      rainSurge:              map['gig_rain_surge_active'] === 'true',
      platformCommissionRate: parseFloat(map['gig_platform_commission_rate'] ?? '0.12'),
      travelFeePerKmBeyond5:  parseFloat(map['gig_travel_fee_per_km'] ?? '15'),
    };
  } catch {
    // fallback defaults if table missing / unreachable
    return { festivalSurge: false, rainSurge: false, platformCommissionRate: 0.12, travelFeePerKmBeyond5: 15 };
  }
}

/**
 * Find the nearest available worker to the job site and return the distance in km.
 * Falls back to 0 if no workers found (no travel fee applied).
 */
async function getNearestWorkerDistanceKm(lat: number, lng: number): Promise<number> {
  try {
    const workers = await prisma.worker.findMany({
      where: { isActive: true, status: 'AVAILABLE' },
      select: { currentLat: true, currentLng: true },
    });
    if (workers.length === 0) return 0;

    const R = 6371;
    let minKm = Infinity;
    for (const w of workers) {
      if (w.currentLat == null || w.currentLng == null) continue;
      const dLat = ((w.currentLat - lat) * Math.PI) / 180;
      const dLng = ((w.currentLng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) *
        Math.cos((w.currentLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
      const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (km < minKm) minKm = km;
    }
    return minKm === Infinity ? 0 : Math.round(minKm * 10) / 10;
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────
// ESTIMATE (no DB write — for preview in Flutter)
// ─────────────────────────────────────────────

export async function estimateGigFare(input: {
  locationLat:   number;
  locationLng:   number;
  gigCategory:   string;
  durationHours: number;
  urgency:       string;
  workersNeeded: number;
  scheduledHour?: number;
}) {
  const config = await getGigConfig();
  const workerDistanceKm = await getNearestWorkerDistanceKm(input.locationLat, input.locationLng);

  const req: GigFareRequest = {
    locationLat:           input.locationLat,
    locationLng:           input.locationLng,
    gigCategory:           input.gigCategory as GigSkill,
    durationHours:         input.durationHours,
    urgency:               input.urgency as GigUrgency,
    workersNeeded:         input.workersNeeded,
    workerDistanceKm,
    festivalSurge:         config.festivalSurge,
    rainSurge:             config.rainSurge,
    scheduledHour:         input.scheduledHour,
    platformCommissionRate:config.platformCommissionRate,
    travelFeePerKmBeyond5: config.travelFeePerKmBeyond5,
  };

  const breakdown = calculateGigFare(req);

  return {
    estimate: breakdown,
    workerDistanceKm,
    note: 'Estimate only. Actual fare computed at booking time.',
  };
}

// ─────────────────────────────────────────────
// CREATE GIG
// ─────────────────────────────────────────────

export async function createGig(customerId: string, data: any) {
  const config = await getGigConfig();
  const workerDistanceKm = await getNearestWorkerDistanceKm(data.locationLat, data.locationLng);

  const req: GigFareRequest = {
    locationLat:           data.locationLat,
    locationLng:           data.locationLng,
    gigCategory:           (data.gigCategory ?? 'HELPER') as GigSkill,
    durationHours:         data.durationHours ?? 2,
    urgency:               (data.urgency ?? 'SCHEDULED') as GigUrgency,
    workersNeeded:         data.workersNeeded ?? 1,
    workerDistanceKm,
    festivalSurge:         config.festivalSurge,
    rainSurge:             config.rainSurge,
    scheduledHour:         data.scheduledHour,
    platformCommissionRate:config.platformCommissionRate,
    travelFeePerKmBeyond5: config.travelFeePerKmBeyond5,
  };

  
  let breakdown = calculateGigFare(req);

  if (data.isTaskBased && data.tasks) {
    const tasksTotal = data.tasks.reduce((sum: number, t: any) => sum + (t.price * t.quantity), 0);
    const grandTotal = tasksTotal + (data.tipAmount || 0);
    // Rough estimate for task based platform fee (e.g., 20%)
    const platformFee = tasksTotal * 0.20;
    
    breakdown = {
      zone: classifyZone(data.locationLat || 0, data.locationLng || 0),
      baseHourlyRate: tasksTotal,
      skillMultiplier: 1,
      hoursMultiplier: 1,
      rawEarnings: tasksTotal,
      urgencyPremium: 0,
      demandSurge: 0,
      travelFee: 0,
      workerEarnings: grandTotal - platformFee,
      platformFeeRate: 0.20,
      platformFeePerWorker: platformFee,
      customerPerWorker: grandTotal,
      workersNeeded: 1,
      grandTotal: grandTotal,
      totalWorkerPayout: grandTotal - platformFee,
      platformRevenue: platformFee,
      appliedSurgeMultipliers: [],
      distanceKm: workerDistanceKm || 0
    } as any;
  }

  const zone = classifyZone(data.locationLat, data.locationLng);

  logger.info(
    `[GigPricing] Creating GIG — zone=${zone} cat=${req.gigCategory} hrs=${req.durationHours} ` +
    `workers=${req.workersNeeded} grandTotal=₹${breakdown.grandTotal} platformFee=₹${breakdown.platformRevenue}`
  );

  let gig: any;
  try {
    gig = await prisma.gigJob.create({
      data: {
        jobNumber:    `GIG-${Math.floor(100000 + Math.random() * 900000)}`,
        customerId,
        gigType:      data.gigCategory ?? data.gigType ?? 'HELPER',
        gigCategory:  req.gigCategory,
        description:  data.description,
        locationLat:  data.locationLat,
        locationLng:  data.locationLng,
        locationAddress: data.locationAddress,
        locationZone: zone,
        durationHours: req.durationHours,
        urgency:       req.urgency,
        workersNeeded: req.workersNeeded,
        totalFare:     breakdown.grandTotal,
        perWorkerRate: breakdown.workerEarnings,
        platformFee:   breakdown.platformRevenue,
        fareBreakdown: breakdown as any,

        status:        'PENDING',
        paymentMethod: (data.paymentMethod as any) || (data.isCash ? PaymentMethod.CASH : PaymentMethod.UPI),
        paymentStatus: (data.paymentStatus as any) || PaymentStatus.PENDING,
        isTaskBased:   data.isTaskBased || false,
        scheduledSlot: data.scheduledSlot,
        tipAmount:     data.tipAmount || 0,
        tasks: data.tasks && data.tasks.length > 0 ? {
          create: data.tasks.map((t: any) => ({
            title: t.title,
            category: t.category,
            quantity: t.quantity,
            price: t.price,
            variant: t.variant
          }))
        } : undefined
      },
      include: {
        tasks: true,
      },
    });
  } catch (err: any) {
    logger.warn(`[createGig] Full creation failed, falling back to base schema: ${err.message}`);
    gig = await prisma.gigJob.create({
      data: {
        jobNumber:    `GIG-${Math.floor(100000 + Math.random() * 900000)}`,
        customerId,
        gigType:      data.gigCategory ?? data.gigType ?? 'HELPER',
        gigCategory:  req.gigCategory,
        description:  data.description ?? (data.tasks ? JSON.stringify(data.tasks) : undefined),
        locationLat:  data.locationLat,
        locationLng:  data.locationLng,
        locationAddress: data.locationAddress,
        locationZone: zone,
        durationHours: req.durationHours,
        urgency:       req.urgency,
        workersNeeded: req.workersNeeded,
        totalFare:     breakdown.grandTotal,
        perWorkerRate: breakdown.workerEarnings,
        platformFee:   breakdown.platformRevenue,
        fareBreakdown: breakdown as any,
        status:        'PENDING',
        paymentMethod: (data.paymentMethod as any) || (data.isCash ? PaymentMethod.CASH : PaymentMethod.UPI),
        paymentStatus: (data.paymentStatus as any) || PaymentStatus.PENDING,
      },
    });
  }

  // Notify nearby workforce via Socket.IO
  const io = getSocketInstance();
  if (io) {
    io.of('/workforce').emit('new_gig_job', {
      ...gig,
      fareBreakdown: breakdown,
      workerEarnings: breakdown.workerEarnings,
    });
  }

  // 1. Notify the Hirer / Customer (In-App & Push)
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { id: true, fcmToken: true },
  });

  const categoryName = req.gigCategory || 'Service';
  createNotification(
    customerId,
    '📋 Booking Placed!',
    `Your booking #${gig.jobNumber} for ${categoryName} has been created. We are matching top service partners nearby.`,
    NotificationType.BOOKING_STATUS,
    gig.id,
  ).catch((err) => logger.error('[Gig] In-app notification to customer failed:', err));

  if (customer?.fcmToken) {
    notificationService.sendToDevice(customer.fcmToken, {
      title: '📋 Booking Placed!',
      body: `Your #${gig.jobNumber} booking for ${categoryName} is active.`,
      data: { type: 'BOOKING_UPDATE', gigId: gig.id },
    }).catch((err) => logger.error('[Gig] FCM to customer failed:', err));
  }

  // 2. Notify available workers (In-App & Push)
  prisma.worker.findMany({
    where: {
      status: 'AVAILABLE',
      isDocVerified: true,
      user: { isActive: true },
    },
    include: {
      user: { select: { id: true, fcmToken: true } },
    },
    take: 15,
  }).then((workers) => {
    for (const w of workers) {
      if (!w.user) continue;
      createNotification(
        w.user.id,
        '🔔 New Job Available!',
        `New ${categoryName} job nearby (${data.locationAddress ? data.locationAddress.substring(0, 40) : 'Active zone'}). Earn ₹${breakdown.workerEarnings}.`,
        NotificationType.BOOKING_STATUS,
        gig.id,
      ).catch(() => {});

      if (w.user.fcmToken) {
        notificationService.sendToDevice(w.user.fcmToken, {
          title: '🔔 New Job Available!',
          body: `New ${categoryName} job nearby. Earn ₹${breakdown.workerEarnings}.`,
          data: { type: 'NEW_JOB', gigId: gig.id },
        }).catch(() => {});
      }
    }
  }).catch((err) => logger.error('[Gig] Worker notification batch failed:', err));

  return { gig, fareBreakdown: breakdown };
}

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

export async function getCustomerGigs(customerId: string) {
  try {
    return await prisma.gigJob.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: true,
        assignments: {
          include: {
            worker: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    profileImageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (err: any) {
    logger.warn(`[getCustomerGigs] Full include query failed, trying simple query: ${err.message}`);
    try {
      return await prisma.gigJob.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        include: {
          tasks: true,
        },
      });
    } catch (err2: any) {
      logger.warn(`[getCustomerGigs] Query with tasks failed, falling back to base table: ${err2.message}`);
      return await prisma.gigJob.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
    }
  }
}

export async function cancelGig(customerId: string, gigId: string, reason?: string) {
  const gig = await prisma.gigJob.findUnique({
    where: { id: gigId },
    include: {
      assignments: {
        include: {
          worker: {
            include: {
              user: {
                select: { id: true, fcmToken: true },
              },
            },
          },
        },
      },
    },
  });
  if (!gig) throw AppError.notFound('Gig job not found');
  if (gig.customerId !== customerId) throw AppError.forbidden('You are not authorized to cancel this booking');
  if (gig.status === 'COMPLETED' || gig.status === 'CANCELLED') {
    throw AppError.badRequest(`Cannot cancel a job that is already ${gig.status.toLowerCase()}`);
  }

  const updated = await prisma.gigJob.update({
    where: { id: gigId },
    data: {
      status: 'CANCELLED',
      description: reason ? `${gig.description || ''} [Cancelled: ${reason}]` : gig.description,
    },
    include: {
      tasks: true,
      assignments: true,
    },
  });

  // 1. In-app notification to the Hirer
  createNotification(
    customerId,
    '❌ Booking Cancelled',
    `Your booking #${gig.jobNumber} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
    NotificationType.BOOKING_STATUS,
    gigId,
  ).catch((err) => logger.error('[Gig] Customer cancel in-app notification failed:', err));

  // 2. Notify and release any assigned workers
  for (const a of gig.assignments) {
    if (['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(a.status)) {
      prisma.gigAssignment.update({
        where: { id: a.id },
        data: { status: WorkerJobStatus.CANCELLED },
      }).catch(() => {});

      prisma.worker.update({
        where: { id: a.workerId },
        data: { status: 'AVAILABLE' },
      }).catch(() => {});

      if (a.worker?.user) {
        createNotification(
          a.worker.user.id,
          '❌ Job Cancelled',
          `Booking #${gig.jobNumber} has been cancelled by the hirer.${reason ? ` Reason: ${reason}` : ''}`,
          NotificationType.BOOKING_STATUS,
          gigId,
        ).catch(() => {});

        if (a.worker.user.fcmToken) {
          notificationService.sendToDevice(a.worker.user.fcmToken, {
            title: '❌ Job Cancelled',
            body: `Job #${gig.jobNumber} was cancelled by the hirer.`,
            data: { type: 'JOB_CANCELLED', gigId },
          }).catch(() => {});
        }
      }
    }
  }

  const io = getSocketInstance();
  if (io) {
    io.of('/workforce').to(`gig:${gigId}`).emit('gig_cancelled', {
      gigId,
      reason,
    });
  }

  return updated;
}

export async function getNearbyGigs(lat: number, lng: number, _radiusKm: number) {
  // Return all PENDING gigs — radius filter can be added with PostGIS in future
  return prisma.gigJob.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getGigById(id: string) {
  try {
    const gig = await prisma.gigJob.findUnique({
      where: { id },
      include: {
        customer: true,
        tasks: true,
        assignments: {
          include: {
            worker: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    profileImageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!gig) throw AppError.notFound('Gig job not found');
    return gig;
  } catch (err: any) {
    logger.warn(`[getGigById] Full query failed, falling back: ${err.message}`);
    const gig = await prisma.gigJob.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!gig) throw AppError.notFound('Gig job not found');
    return gig;
  }
}

export async function getAllGigs() {
  try {
    return await prisma.gigJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { id: true, name: true, phone: true } }, tasks: true },
    });
  } catch (err: any) {
    logger.warn(`[getAllGigs] Query with tasks failed, falling back: ${err.message}`);
    return prisma.gigJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  }
}

// ─────────────────────────────────────────────
// ACCEPT GIG
// ─────────────────────────────────────────────

export async function acceptGig(workerUserId: string, gigId: string) {
  const worker = await prisma.worker.findUnique({ where: { userId: workerUserId } });
  if (!worker) throw AppError.notFound('Worker profile not found');

  const gig = await prisma.gigJob.findUnique({
    where: { id: gigId },
    include: { assignments: true },
  });
  if (!gig) throw AppError.notFound('Gig job not found');
  if (gig.status !== 'PENDING' && gig.status !== 'ASSIGNED') {
    throw AppError.badRequest('Gig job is no longer available');
  }
  if (gig.assignments.length >= gig.workersNeeded) {
    throw AppError.badRequest('Gig job has already reached required workforce');
  }
  const existingAssignment = gig.assignments.find((a: any) => a.workerId === worker.id);
  if (existingAssignment) throw AppError.badRequest('You have already accepted this job');

  const assignment = await prisma.gigAssignment.create({
    data: {
      gigId,
      workerId:     worker.id,
      status:       'PENDING_ACCEPTANCE',
      payoutAmount: (gig as any).perWorkerRate ?? gig.totalFare / gig.workersNeeded,
    },
  });

  // Promote to ASSIGNED when all workers filled
  if (gig.assignments.length + 1 >= gig.workersNeeded) {
    await prisma.gigJob.update({
      where: { id: gigId },
      data: { status: 'ASSIGNED' },
    });
  }

  return assignment;
}

// ─────────────────────────────────────────────
// GIG PAYMENT (RAZORPAY & UPI INTENT)
// ─────────────────────────────────────────────

export async function createGigPaymentOrder(userId: string, gigId: string) {
  const gig = await prisma.gigJob.findUnique({ where: { id: gigId } });
  if (!gig) throw AppError.notFound('Gig job not found');
  if (gig.customerId !== userId) throw AppError.forbidden('Access denied');

  if (gig.paymentStatus === 'PAID') {
    throw AppError.conflict('Gig job is already paid');
  }

  const amountPaise = Math.round(gig.totalFare * 100);
  if (amountPaise < 100) {
    throw AppError.badRequest('Payment amount must be at least ₹1.00');
  }

  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_SttHUdu0eZT95x';
  let razorpayOrderId: string | null = gig.razorpayOrderId;

  if (!razorpayOrderId && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: gig.jobNumber,
        notes: {
          type: 'GIG_PAYMENT',
          gigId: gig.id,
          userId,
        },
      });
      razorpayOrderId = order.id;
      await prisma.gigJob.update({
        where: { id: gig.id },
        data: { razorpayOrderId },
      });
    } catch (err: any) {
      logger.error(`[createGigPaymentOrder] Razorpay create order failed: ${err.message}`);
    }
  }

  const upiIntentUrl = `upi://pay?pa=rzppay@icici&pn=MetroMitra&tr=${razorpayOrderId || gig.jobNumber}&am=${gig.totalFare}&cu=INR&tn=${encodeURIComponent('Metro Mitra Service Booking ' + gig.jobNumber)}`;

  return {
    orderId: razorpayOrderId || `ORD-${gig.jobNumber}`,
    amount: amountPaise,
    currency: 'INR',
    keyId,
    upiIntentUrl,
    gigId: gig.id,
  };
}

export async function verifyGigPayment(
  userId: string,
  gigId: string,
  input: { razorpayPaymentId: string; razorpayOrderId: string; razorpaySignature: string; isMock?: boolean }
) {
  const gig = await prisma.gigJob.findUnique({ where: { id: gigId } });
  if (!gig) throw AppError.notFound('Gig job not found');
  if (gig.customerId !== userId) throw AppError.forbidden('Access denied');

  if (input.isMock || !process.env.RAZORPAY_KEY_SECRET) {
    const updated = await prisma.gigJob.update({
      where: { id: gigId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: PaymentMethod.UPI,
      },
    });
    return { success: true, gig: updated };
  }

  const text = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  if (expectedSignature !== input.razorpaySignature) {
    throw AppError.badRequest('Invalid Razorpay signature');
  }

  const updated = await prisma.gigJob.update({
    where: { id: gigId },
    data: {
      paymentStatus: 'PAID',
      paymentMethod: PaymentMethod.UPI,
    },
  });

  return { success: true, gig: updated };
}
