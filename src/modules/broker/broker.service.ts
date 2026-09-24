import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';
import { UserRole, BrokerBookingStatus, BrokerQuoteStatus, BountySettlementStatus } from '@prisma/client';
import { assertBrokerTransition } from '../booking/booking.transition';
import {
  PostBrokerLoadInput,
  SubmitBrokerQuoteInput,
  ReviewBrokerQuoteInput,
  ConfirmAdvanceInput,
  VerifyLoadingOtpInput,
  SettleBountyInput,
  BrokerLoadsQuery,
  UpdateAgentKycInput,
  AdminAgentsQuery,
  UpdateBrokerConfigInput,
} from './broker.schema';

export async function createBrokerLoad(customerId: string, data: PostBrokerLoadInput) {
  const load = await prisma.brokerLoad.create({
    data: {
      customerId,
      vehicleType: data.vehicleType,
      pickupCity: data.pickupCity,
      pickupAddress: data.pickupAddress,
      dropCity: data.dropCity,
      dropAddress: data.dropAddress,
      goodsType: data.goodsType,
      goodsWeightKg: data.goodsWeightKg,
      estimatedDistanceKm: data.estimatedDistanceKm,
      customerBudget: data.customerBudget,
      targetCities: data.targetCities,
      brokerStatus: BrokerBookingStatus.SOURCING,
      auditLog: {
        create: {
          action: 'LOAD_POSTED',
          actorId: customerId,
          actorRole: 'CUSTOMER',
        }
      }
    }
  });
  return load;
}

export async function listBrokerLoads(query: BrokerLoadsQuery, brokerId?: string, isAdmin?: boolean) {
  const { page, limit, status, city } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) {
    where.brokerStatus = status;
  }
  if (city) {
    where.OR = [
      { pickupCity: { contains: city, mode: 'insensitive' } },
      { dropCity: { contains: city, mode: 'insensitive' } },
    ];
  }

  if (!isAdmin && brokerId) {
    where.brokerStatus = { in: [BrokerBookingStatus.SOURCING, BrokerBookingStatus.RE_SOURCING] };
    const profile = await prisma.brokerProfile.findUnique({ where: { userId: brokerId } });
    if (profile?.primaryCity) {
      where.OR = [
        { targetCities: { isEmpty: true } },
        { targetCities: { has: profile.primaryCity } }
      ];
    }
  }

  const [loads, total] = await prisma.$transaction([
    prisma.brokerLoad.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: { select: { quotes: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.brokerLoad.count({ where })
  ]);

  return {
    loads,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}

export async function getBrokerLoad(loadId: string, requesterId: string, requesterRole: UserRole) {
  const load = await prisma.brokerLoad.findUnique({
    where: { id: loadId },
    include: {
      quotes: requesterRole === UserRole.ADMIN ? true : { where: { brokerId: requesterId } }
    }
  });
  if (!load) throw AppError.notFound('Load not found');
  return load;
}

export async function submitBrokerQuote(loadId: string, brokerId: string, data: SubmitBrokerQuoteInput) {
  return await prisma.$transaction(async (tx) => {
    const load = await tx.brokerLoad.findUnique({ where: { id: loadId } });
    if (!load) throw AppError.notFound('Load not found');
    
    if (load.brokerStatus !== BrokerBookingStatus.SOURCING && load.brokerStatus !== BrokerBookingStatus.RE_SOURCING) {
      throw AppError.badRequest('Load is not open for quoting');
    }

    const existingQuote = await tx.brokerQuote.findFirst({
      where: { loadId, brokerId, status: { not: BrokerQuoteStatus.REJECTED } }
    });
    if (existingQuote) throw AppError.badRequest('You have already submitted a quote for this load', 'DUPLICATE_QUOTE');

    const profile = await tx.brokerProfile.findUnique({ where: { userId: brokerId } });
    if (!profile?.isKycVerified) throw AppError.forbidden('KYC verification is required to submit quotes');
    const created = await tx.brokerQuote.create({
      data: {
        loadId,
        brokerId,
        driverPhone: data.driverPhone,
        driverName: data.driverName,
        vehicleRegNo: data.vehicleRegNo,
        vehicleRcPhotoUrl: data.vehicleRcPhotoUrl,
        vehiclePhotoUrl: data.vehiclePhotoUrl,
        negotiatedAmount: data.negotiatedAmount,
        flatFeeBounty: data.flatFeeBounty,
        status: BrokerQuoteStatus.PENDING,
      }
    });

    assertBrokerTransition(load.brokerStatus, BrokerBookingStatus.PENDING_REVIEW);
    await tx.brokerLoad.update({
      where: { id: loadId },
      data: {
        brokerStatus: BrokerBookingStatus.PENDING_REVIEW,
        auditLog: {
          create: {
            action: 'QUOTE_SUBMITTED',
            actorId: brokerId,
            actorRole: 'MIDDLEMAN',
            metadata: { quoteId: created.id, vehicleRegNo: data.vehicleRegNo, negotiatedAmount: data.negotiatedAmount }
          }
        }
      }
    });

    await tx.brokerProfile.update({
      where: { userId: brokerId },
      data: { totalQuotesSubmitted: { increment: 1 } }
    });

    return created;
  });
}

export async function reviewBrokerQuote(quoteId: string, opsUserId: string, data: ReviewBrokerQuoteInput) {
  return await prisma.$transaction(async (tx) => {
    const quote = await tx.brokerQuote.findUnique({ where: { id: quoteId }, include: { load: true } });
    if (!quote) throw AppError.notFound('Quote not found');
    const load = quote.load;
    if (data.action === 'ACCEPT') {
      if (load.brokerStatus !== BrokerBookingStatus.PENDING_REVIEW) {
        throw AppError.badRequest('Load is not in pending review state');
      }

      await tx.brokerQuote.updateMany({
        where: { loadId: load.id, id: { not: quote.id } },
        data: { status: BrokerQuoteStatus.REJECTED }
      });

      const acceptedQuote = await tx.brokerQuote.update({
        where: { id: quote.id },
        data: { status: BrokerQuoteStatus.ACCEPTED }
      });

      assertBrokerTransition(load.brokerStatus, BrokerBookingStatus.ADVANCE_PENDING);
      
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await tx.brokerLoad.update({
        where: { id: load.id },
        data: {
          selectedQuoteId: quote.id,
          brokerStatus: BrokerBookingStatus.ADVANCE_PENDING,
          loadingOtp: otp,
          loadingOtpExpiry: expiry,
          auditLog: {
            create: {
              action: 'QUOTE_ACCEPTED',
              actorId: opsUserId,
              actorRole: 'ADMIN',
              metadata: { quoteId: quote.id }
            }
          }
        }
      });
      return acceptedQuote;
    } else if (data.action === 'REJECT') {
      const rejectedQuote = await tx.brokerQuote.update({
        where: { id: quote.id },
        data: { status: BrokerQuoteStatus.REJECTED, rejectedReason: data.rejectedReason }
      });

      const remainingQuotes = await tx.brokerQuote.count({
        where: { loadId: load.id, status: { not: BrokerQuoteStatus.REJECTED } }
      });

      if (remainingQuotes === 0) {
        assertBrokerTransition(load.brokerStatus, BrokerBookingStatus.SOURCING);
        await tx.brokerLoad.update({
          where: { id: load.id },
          data: {
            brokerStatus: BrokerBookingStatus.SOURCING,
            auditLog: {
              create: {
                action: 'QUOTE_REJECTED',
                actorId: opsUserId,
                actorRole: 'ADMIN',
                metadata: { quoteId: quote.id, reason: data.rejectedReason, revertedToSourcing: true }
              }
            }
          }
        });
      } else {
        await tx.brokerLoadAuditLog.create({
          data: {
            loadId: load.id,
            action: 'QUOTE_REJECTED',
            actorId: opsUserId,
            actorRole: 'ADMIN',
            metadata: { quoteId: quote.id, reason: data.rejectedReason }
          }
        });
      }
      return rejectedQuote;
    } else if (data.action === 'COUNTER') {
      const counteredQuote = await tx.brokerQuote.update({
        where: { id: quote.id },
        data: { status: BrokerQuoteStatus.COUNTER_OFFERED, counterAmount: data.counterAmount }
      });
      await tx.brokerLoadAuditLog.create({
        data: {
          loadId: load.id,
          action: 'QUOTE_COUNTERED',
          actorId: opsUserId,
          actorRole: 'ADMIN',
          metadata: { quoteId: quote.id, counterAmount: data.counterAmount }
        }
      });
      return counteredQuote;
    }
  });
}

export async function confirmAdvanceCollected(loadId: string, opsUserId: string, data: ConfirmAdvanceInput) {
  return await prisma.$transaction(async (tx) => {
    const load = await tx.brokerLoad.findUnique({ where: { id: loadId } });
    if (!load) throw AppError.notFound('Load not found');
    if (load.brokerStatus !== BrokerBookingStatus.ADVANCE_PENDING) throw AppError.badRequest('Load is not waiting for advance');

    assertBrokerTransition(load.brokerStatus, BrokerBookingStatus.BOOKING_LOCKED);
    return await tx.brokerLoad.update({
      where: { id: loadId },
      data: {
        brokerStatus: BrokerBookingStatus.BOOKING_LOCKED,
        isAdvanceCollected: true,
        advanceAmount: data.advanceAmount,
        advanceCollectedAt: new Date(),
        advancePaymentRef: data.advancePaymentRef,
        auditLog: {
          create: {
            action: 'ADVANCE_CONFIRMED',
            actorId: opsUserId,
            actorRole: 'ADMIN',
          }
        }
      }
    });
  });
}

export async function confirmPhysicalLoading(loadId: string, driverPhone: string, data: VerifyLoadingOtpInput) {
  return await prisma.$transaction(async (tx) => {
    const load = await tx.brokerLoad.findUnique({
      where: { id: loadId }
    });
    if (!load) throw AppError.notFound('Load not found');
    if (load.brokerStatus !== BrokerBookingStatus.BOOKING_LOCKED) throw AppError.badRequest('Load is not ready for loading');

    if (load.loadingOtp !== data.loadingOtp) throw AppError.badRequest('Invalid loading OTP', 'INVALID_LOADING_OTP');
    if (load.loadingOtpExpiry && load.loadingOtpExpiry < new Date()) throw AppError.badRequest('Loading OTP expired', 'LOADING_OTP_EXPIRED');

    if (!load.selectedQuoteId) throw AppError.badRequest('No selected quote');

    const selectedQuote = await tx.brokerQuote.findUnique({ where: { id: load.selectedQuoteId } });

    if (selectedQuote?.driverPhone !== driverPhone) {
      throw AppError.forbidden('Only the assigned driver can confirm loading');
    }
    assertBrokerTransition(load.brokerStatus, BrokerBookingStatus.LOADING_CONFIRMED);
    const updatedLoad = await tx.brokerLoad.update({
      where: { id: loadId },
      data: {
        brokerStatus: BrokerBookingStatus.LOADING_CONFIRMED,
        isLoadingConfirmed: true,
        loadingConfirmedAt: new Date(),
        loadingConfirmedByDriverId: driverPhone, // Note: using phone here per requirements if ID is not available
        auditLog: {
          create: {
            action: 'LOADING_CONFIRMED',
            actorId: driverPhone,
            actorRole: 'DRIVER',
          }
        }
      }
    });

    await tx.brokerBountyLedger.create({
      data: {
        quoteId: load.selectedQuoteId!,
        brokerId: selectedQuote!.brokerId,
        bountyAmount: selectedQuote!.flatFeeBounty,
        settlementStatus: BountySettlementStatus.ELIGIBLE,
        eligibleAt: new Date(),
      }
    });

    const brokerProfile = await tx.brokerProfile.findUnique({ where: { userId: selectedQuote!.brokerId } });
    if (brokerProfile) {
      const fulfilled = brokerProfile.totalLoadsFulfilled + 1;
      const rate = brokerProfile.totalQuotesSubmitted > 0 ? (fulfilled / brokerProfile.totalQuotesSubmitted) * 100 : 0;
      await tx.brokerProfile.update({
        where: { userId: brokerProfile.userId },
        data: { totalLoadsFulfilled: fulfilled, successRate: rate }
      });
    }

    return updatedLoad;
  });
}

export async function markDriverDropout(loadId: string, opsUserId: string, reason: string) {
  const load = await prisma.brokerLoad.findUnique({ where: { id: loadId } });
  if (!load) throw AppError.notFound('Load not found');
  if (load.brokerStatus !== BrokerBookingStatus.BOOKING_LOCKED) throw AppError.badRequest('Load is not in a droppable state');

  return await prisma.$transaction(async (tx) => {
    if (load.selectedQuoteId) {
      await tx.brokerQuote.update({
        where: { id: load.selectedQuoteId },
        data: { status: BrokerQuoteStatus.DRIVER_DROPOUT }
      });

      const bounty = await tx.brokerBountyLedger.findUnique({ where: { quoteId: load.selectedQuoteId } });
      if (bounty) {
        await tx.brokerBountyLedger.update({
          where: { id: bounty.id },
          data: { settlementStatus: BountySettlementStatus.VOIDED, voidedAt: new Date(), voidReason: reason }
        });
      }
    }

    assertBrokerTransition(load.brokerStatus, BrokerBookingStatus.RE_SOURCING);
    const updated = await tx.brokerLoad.update({
      where: { id: loadId },
      data: {
        brokerStatus: BrokerBookingStatus.RE_SOURCING,
        isUrgent: true,
        selectedQuoteId: null,
        auditLog: {
          create: {
            action: 'DRIVER_DROPOUT',
            actorId: opsUserId,
            actorRole: 'ADMIN',
            metadata: { reason }
          }
        }
      }
    });
    return updated;
  });
}

export async function settleBounty(quoteId: string, opsUserId: string, data: SettleBountyInput) {
  const bounty = await prisma.brokerBountyLedger.findUnique({ where: { quoteId }, include: { quote: true } });
  if (!bounty) throw AppError.notFound('Bounty ledger entry not found');
  if (bounty.settlementStatus !== BountySettlementStatus.ELIGIBLE) throw AppError.badRequest('Bounty is not eligible for settlement');

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.brokerBountyLedger.update({
      where: { id: bounty.id },
      data: {
        settlementStatus: BountySettlementStatus.MANUALLY_SETTLED,
        settledAt: new Date(),
        settledBy: opsUserId,
        settlementRef: data.settlementRef,
        notes: data.notes
      }
    });

    await tx.brokerProfile.update({
      where: { userId: bounty.brokerId },
      data: { totalBountiesEarned: { increment: bounty.bountyAmount } }
    });

    await tx.brokerLoadAuditLog.create({
      data: {
        loadId: bounty.quote.loadId,
        action: 'BOUNTY_SETTLED',
        actorId: opsUserId,
        actorRole: 'ADMIN',
        metadata: { bountyId: bounty.id, amount: bounty.bountyAmount }
      }
    });

    return updated;
  });
}

export async function getAdminBountyDashboard(query: { status?: string, page: number, limit: number }) {
  const { status, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.settlementStatus = status;

  const [ledgers, total] = await prisma.$transaction([
    prisma.brokerBountyLedger.findMany({
      where,
      skip,
      take: limit,
      include: {
        quote: {
          include: {
            broker: { include: { user: { select: { name: true, phone: true } } } },
            load: { select: { pickupCity: true, dropCity: true, vehicleType: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.brokerBountyLedger.count({ where })
  ]);

  return { ledgers, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getAdminAgents(query: AdminAgentsQuery) {
  const { page, limit, search, isKycVerified, city } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (isKycVerified !== undefined && isKycVerified !== 'all' && isKycVerified !== '') {
    where.isKycVerified = isKycVerified === 'true' || isKycVerified === 'verified';
  }
  if (city) {
    where.primaryCity = { contains: city, mode: 'insensitive' };
  }
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [agents, total] = await prisma.$transaction([
    prisma.brokerProfile.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, createdAt: true, isActive: true } },
        _count: { select: { quotes: true, driverRetentions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.brokerProfile.count({ where }),
  ]);

  return { agents, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function updateAgentKyc(agentId: string, opsUserId: string, data: UpdateAgentKycInput) {
  const profile = await prisma.brokerProfile.findUnique({ where: { id: agentId }, include: { user: true } });
  if (!profile) throw AppError.notFound('Agent profile not found');

  const updated = await prisma.brokerProfile.update({
    where: { id: agentId },
    data: {
      isKycVerified: data.isKycVerified,
      kycVerifiedAt: data.isKycVerified ? new Date() : null,
    },
    include: {
      user: { select: { name: true, phone: true, email: true } },
    },
  });

  return updated;
}

// In-memory / dynamic platform commission configuration cache with sensible defaults
let brokerConfigState = {
  customerAdvancePercent: 25,     // Customer pays 25% advance to lock in booking
  platformRetentionPercent: 10,  // Platform retains 10%
  driverAdvancePercent: 15,      // Driver assigned payout advance 15% (upon arrival/loading)
  defaultFlatFeeBounty: 100,     // Default flat-fee bounty paid to Middleman per loaded trip
  driverRetentionBonus: 500,     // Micro-commission for onboarding driver who completes 3 trips
};

export async function getBrokerConfig() {
  return brokerConfigState;
}

export async function updateBrokerConfig(opsUserId: string, data: UpdateBrokerConfigInput) {
  brokerConfigState = {
    ...brokerConfigState,
    ...(data.customerAdvancePercent !== undefined && { customerAdvancePercent: data.customerAdvancePercent }),
    ...(data.platformRetentionPercent !== undefined && { platformRetentionPercent: data.platformRetentionPercent }),
    ...(data.driverAdvancePercent !== undefined && { driverAdvancePercent: data.driverAdvancePercent }),
    ...(data.defaultFlatFeeBounty !== undefined && { defaultFlatFeeBounty: data.defaultFlatFeeBounty }),
    ...(data.driverRetentionBonus !== undefined && { driverRetentionBonus: data.driverRetentionBonus }),
  };
  return brokerConfigState;
}

