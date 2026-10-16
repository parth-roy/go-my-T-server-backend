import crypto from 'crypto';
import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';
import { razorpay } from '../payment/razorpay.client';
import {
  InitiateLeadUnlockInput,
  VerifyLeadUnlockInput,
  PreviewNearbyExpertsInput,
} from './lead-unlock.schema';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function initiateLeadUnlock(userId: string, input: InitiateLeadUnlockInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');

  const amount = input.amount && input.amount > 0 ? input.amount : 49;
  const amountPaise = Math.round(amount * 100);

  const tx = await prisma.leadUnlockTransaction.create({
    data: {
      userId,
      amount,
      serviceCategory: input.serviceCategory?.toUpperCase() || 'PLUMBER',
      latitude: input.latitude,
      longitude: input.longitude,
      searchAddress: input.searchAddress || 'Local Area',
      status: 'PENDING',
    },
  });

  let razorpayOrderId: string | null = null;
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock';

  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: 'LU-' + tx.id.substring(0, 8),
        notes: {
          type: 'LEAD_UNLOCK',
          transactionId: tx.id,
          userId,
          category: input.serviceCategory || 'PLUMBER',
        },
      });
      razorpayOrderId = order.id;
      await prisma.leadUnlockTransaction.update({
        where: { id: tx.id },
        data: { razorpayOrderId },
      });
    } catch (e: any) {
      console.warn('[LeadUnlock] Razorpay order creation failed, falling back to direct mode:', e.message);
    }
  }

  return {
    transactionId: tx.id,
    razorpayOrderId: razorpayOrderId || ('order_mock_' + tx.id.substring(0, 10)),
    amount,
    currency: 'INR',
    keyId,
    serviceCategory: tx.serviceCategory,
  };
}

export async function verifyLeadUnlock(userId: string, input: VerifyLeadUnlockInput) {
  const tx = await prisma.leadUnlockTransaction.findUnique({
    where: { id: input.transactionId },
    include: {
      unlockedWorkers: {
        include: {
          worker: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!tx) throw AppError.notFound('Lead unlock transaction not found');
  if (tx.userId !== userId) throw AppError.forbidden('Access denied to this transaction');

  if (tx.status === 'SUCCESS' && tx.unlockedWorkers.length > 0) {
    return {
      success: true,
      transactionId: tx.id,
      amount: tx.amount,
      workers: tx.unlockedWorkers.map((uw: any) => formatUnlockedWorker(uw.worker, tx.latitude, tx.longitude)),
    };
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw AppError.internal('Payment gateway is not configured');
  }

  if (!input.razorpayPaymentId || !input.razorpaySignature || !tx.razorpayOrderId) {
    throw AppError.badRequest('Missing required payment verification details');
  }

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${tx.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex');

  if (expectedSig !== input.razorpaySignature) {
    await prisma.leadUnlockTransaction.update({
      where: { id: tx.id },
      data: { status: 'FAILED' },
    });
    throw AppError.badRequest('Invalid payment signature');
  }

  const categoryTerm = (tx.serviceCategory || '').toLowerCase().trim();

  let workers = await prisma.worker.findMany({
    where: {
      isActive: true,
      ...(categoryTerm ? {
        OR: [
          { preferredWork: { contains: categoryTerm, mode: 'insensitive' as const } },
          { preferredWork: { contains: 'all', mode: 'insensitive' as const } },
        ],
      } : {}),
    },
    include: { user: true },
    take: 30,
  });

  if (workers.length === 0 && categoryTerm) {
    workers = await prisma.worker.findMany({
      where: {
        isActive: true,
        OR: [
          { preferredWork: null },
          { preferredWork: { contains: 'all', mode: 'insensitive' as const } },
        ],
      },
      include: { user: true },
      take: 30,
    });
  }

  const scoredWorkers = workers.map((w: any) => {
    const hasCoords = typeof w.currentLat === 'number' && typeof w.currentLng === 'number';
    const distanceKm = hasCoords
      ? Math.round(haversineKm(tx.latitude, tx.longitude, w.currentLat, w.currentLng) * 10) / 10
      : null;
    return {
      worker: w,
      distanceKm: distanceKm ?? 0,
    };
  });

  scoredWorkers.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
  const selected = scoredWorkers.slice(0, 10);

  for (const item of selected) {
    await prisma.unlockedWorker.upsert({
      where: {
        transactionId_workerId: {
          transactionId: tx.id,
          workerId: item.worker.id,
        },
      },
      update: {},
      create: {
        transactionId: tx.id,
        workerId: item.worker.id,
      },
    });
  }

  await prisma.leadUnlockTransaction.update({
    where: { id: tx.id },
    data: {
      status: 'SUCCESS',
      razorpayPaymentId: input.razorpayPaymentId,
    },
  });

  const formattedWorkers = selected.map((item: any) => formatUnlockedWorker(item.worker, tx.latitude, tx.longitude, item.distanceKm));

  return {
    success: true,
    transactionId: tx.id,
    amount: tx.amount,
    serviceCategory: tx.serviceCategory,
    workers: formattedWorkers,
  };
}

export async function getUnlockedWorkers(userId: string, transactionId: string) {
  const tx = await prisma.leadUnlockTransaction.findUnique({
    where: { id: transactionId },
    include: {
      unlockedWorkers: {
        include: {
          worker: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!tx) throw AppError.notFound('Transaction not found');
  if (tx.userId !== userId) throw AppError.forbidden('Access denied');
  if (tx.status !== 'SUCCESS') throw AppError.badRequest('Transaction payment not completed');

  return {
    transactionId: tx.id,
    amount: tx.amount,
    serviceCategory: tx.serviceCategory,
    unlockedAt: tx.updatedAt,
    workers: tx.unlockedWorkers.map((uw: any) => formatUnlockedWorker(uw.worker, tx.latitude, tx.longitude)),
  };
}

function buildWorkerBadges(w: any): string[] {
  const badges: string[] = [];
  if (w.isDocVerified || w.aadhaarVerifStatus === 'VERIFIED') {
    badges.push('Aadhaar Verified');
  }
  if (w.bankVerified) {
    badges.push('Bank Verified');
  }
  if (w.rating >= 4.5 && w.totalJobs >= 10) {
    badges.push('Top Rated');
  }
  return badges;
}

export async function previewNearbyExperts(input: PreviewNearbyExpertsInput) {
  const categoryTerm = (input.serviceCategory || '').toLowerCase().trim();

  let workers = await prisma.worker.findMany({
    where: {
      isActive: true,
      ...(categoryTerm ? {
        OR: [
          { preferredWork: { contains: categoryTerm, mode: 'insensitive' as const } },
          { preferredWork: { contains: 'all', mode: 'insensitive' as const } },
        ],
      } : {}),
    },
    include: { user: true },
    take: 10,
  });

  if (workers.length === 0 && categoryTerm) {
    workers = await prisma.worker.findMany({
      where: {
        isActive: true,
        OR: [
          { preferredWork: null },
          { preferredWork: { contains: 'all', mode: 'insensitive' as const } },
        ],
      },
      include: { user: true },
      take: 10,
    });
  }

  const previews = workers.map((w: any) => {
    const hasCoords = typeof w.currentLat === 'number' && typeof w.currentLng === 'number';
    const dist = hasCoords
      ? Math.round(haversineKm(input.latitude, input.longitude, w.currentLat, w.currentLng) * 10) / 10
      : 0;

    const rawName = w.user?.name || 'Verified Professional';
    const nameParts = rawName.split(' ');
    const maskedName = nameParts.length > 1 ? (nameParts[0] + ' ' + nameParts[1][0] + '.') : rawName;

    const rawPhone = w.user?.phone || '';
    const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);
    const maskedPhone = cleanDigits.length === 10
      ? `+91 ${cleanDigits.slice(0, 2)}••••••${cleanDigits.slice(-2)}`
      : '+91 ••••••••••';

    return {
      id: w.id,
      workerId: w.id,
      name: maskedName,
      category: input.serviceCategory?.toUpperCase() || 'EXPERT',
      rating: Number((w.rating ?? 0).toFixed(1)),
      totalJobs: w.totalJobs ?? 0,
      experienceYears: Math.max(1, Math.min(10, Math.floor((w.totalJobs ?? 0) / 10) + 1)),
      distanceKm: dist,
      isVerified: Boolean(w.isDocVerified),
      isDocVerified: Boolean(w.isDocVerified),
      phone: maskedPhone,
      phoneMasked: maskedPhone,
      rawPhone: '',
      whatsappUrl: '',
      badges: buildWorkerBadges(w),
      availableTime: w.availableTime || 'Available Now',
      isLocked: true,
      estQuoteRange: '₹350 - ₹650',
    };
  });

  return {
    category: input.serviceCategory,
    totalAvailableNearYou: previews.length,
    unlockPrice: 49,
    savingsEstimate: 'Save ₹300 - ₹950 by direct hiring',
    experts: previews,
    previews: previews,
    workers: previews,
  };
}

function formatUnlockedWorker(worker: any, customerLat: number, customerLng: number, overrideDistance?: number) {
  const user = worker.user || {};
  const hasCoords = typeof worker.currentLat === 'number' && typeof worker.currentLng === 'number';
  const dist = overrideDistance ?? (hasCoords ? Math.round(haversineKm(customerLat, customerLng, worker.currentLat, worker.currentLng) * 10) / 10 : 0);

  const rawPhone = user.phone || '';
  const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10);
  const formattedPhone = cleanDigits.length === 10 ? ('+91 ' + cleanDigits.slice(0, 5) + ' ' + cleanDigits.slice(5)) : (rawPhone ? ('+91 ' + cleanDigits) : 'Not Available');
  const whatsappUrl = cleanDigits.length === 10 ? ('https://wa.me/91' + cleanDigits + '?text=' + encodeURIComponent('Hello! I found your profile on Metro Mitra for service assistance. Are you available for a job?')) : '';

  return {
    workerId: worker.id,
    name: user.name || 'Verified Professional',
    phone: formattedPhone,
    rawPhone: cleanDigits ? '+91' + cleanDigits : '',
    whatsappUrl,
    avatarUrl: user.profileImageUrl || null,
    rating: Number((worker.rating ?? 0).toFixed(1)),
    totalJobs: worker.totalJobs ?? 0,
    experienceYears: Math.max(1, Math.min(10, Math.floor((worker.totalJobs ?? 0) / 10) + 1)),
    distanceKm: dist,
    isDocVerified: Boolean(worker.isDocVerified),
    badges: buildWorkerBadges(worker),
    availableTime: worker.availableTime || 'Immediate (Within 30 mins)',
  };
}
