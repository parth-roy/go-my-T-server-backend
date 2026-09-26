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
  AdminCreateAgentInput,
  AdminUpdateAgentInput,
  AdminAgentStatusInput,
  AdminBulkDeleteAgentsInput,
  UpdateBrokerConfigInput,
} from './broker.schema';

export async function createBrokerLoad(customerId: string, data: PostBrokerLoadInput) {
  const user = await prisma.user.findUnique({
    where: { id: customerId },
    include: { brokerProfile: true },
  });
  if (user?.role === UserRole.MIDDLEMAN && !user.brokerProfile?.isKycVerified) {
    throw AppError.forbidden('KYC Verification Required. Please complete your agent KYC and await admin verification before posting freight loads.');
  }

  const load = await prisma.brokerLoad.create({
    data: {
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
          actorRole: (user?.role as any) || 'CUSTOMER',
        }
      }
    }
  });
  return load;
}

export function extractCityFromAddress(address?: string | null): string {
  if (!address) return 'India';
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2]?.replace(/\d{6}/g, '').trim();
    if (candidate && candidate.length > 2 && candidate.length < 35) {
      return candidate;
    }
  }
  return parts[0]?.slice(0, 35) || 'India';
}

export async function syncOpenBookingsToBrokerLoads() {
  try {
    const openBookings = await prisma.booking.findMany({
      where: {
        driverId: null,
        status: { in: ['CONFIRMED', 'DRAFT'] },
      },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    for (const b of openBookings) {
      const existing = await prisma.brokerLoad.findUnique({
        where: { sourceBookingId: b.id },
      });
      if (!existing) {
        const pCity = extractCityFromAddress(b.pickupAddress);
        const dAddress = b.stops && b.stops.length > 0 ? b.stops[b.stops.length - 1].address : b.pickupAddress;
        const dCity = extractCityFromAddress(dAddress);

        await prisma.brokerLoad.create({
          data: {
            sourceBookingId: b.id,
            pickupCity: pCity,
            pickupAddress: b.pickupAddress,
            dropCity: dCity,
            dropAddress: dAddress,
            vehicleType: b.vehicleType,
            goodsType: b.goodsType || 'General Goods',
            goodsWeightKg: b.goodsWeightKg,
            customerBudget: b.grandTotal || b.totalFare || b.baseFare || 1200,
            targetCities: [pCity.toLowerCase(), dCity.toLowerCase()],
            brokerStatus: BrokerBookingStatus.SOURCING,
            isUrgent: b.declineCount > 0,
          },
        });
      }
    }
  } catch (err) {
    // Non-blocking sync
  }
}

export async function listBrokerLoads(query: BrokerLoadsQuery, brokerId?: string, isAdmin?: boolean) {
  const { page, limit, status, city, search, vehicleType, minBudget, maxBudget, isUrgent, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  // 1. Auto-sync open customer bookings from App and Web to broker_loads
  await syncOpenBookingsToBrokerLoads();

  const where: any = {};
  if (status) {
    where.brokerStatus = status;
  } else if (!isAdmin) {
    where.brokerStatus = { in: [BrokerBookingStatus.SOURCING, BrokerBookingStatus.RE_SOURCING] };
  }

  // Location filter: If city is provided and not 'all', filter specifically for that city
  if (city && city.toLowerCase() !== 'all') {
    const clean = city.trim();
    where.OR = [
      { pickupCity: { contains: clean, mode: 'insensitive' } },
      { dropCity: { contains: clean, mode: 'insensitive' } },
      { pickupAddress: { contains: clean, mode: 'insensitive' } },
      { dropAddress: { contains: clean, mode: 'insensitive' } },
      { targetCities: { has: clean.toLowerCase() } },
    ];
  }

  // Vehicle type filter
  if (vehicleType && vehicleType !== 'all') {
    where.vehicleType = vehicleType;
  }

  // Budget range filter
  if (minBudget !== undefined || maxBudget !== undefined) {
    where.customerBudget = {};
    if (minBudget !== undefined) where.customerBudget.gte = minBudget;
    if (maxBudget !== undefined) where.customerBudget.lte = maxBudget;
  }

  // Urgency filter
  if (isUrgent !== undefined) {
    where.isUrgent = isUrgent;
  }

  // Search filter
  if (search && search.trim()) {
    const s = search.trim();
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { pickupCity: { contains: s, mode: 'insensitive' } },
          { dropCity: { contains: s, mode: 'insensitive' } },
          { pickupAddress: { contains: s, mode: 'insensitive' } },
          { dropAddress: { contains: s, mode: 'insensitive' } },
          { goodsType: { contains: s, mode: 'insensitive' } },
          { id: { contains: s, mode: 'insensitive' } },
        ]
      }
    ];
  }

  let orderBy: any = { createdAt: 'desc' };
  if (sortBy === 'customerBudget') {
    orderBy = { customerBudget: sortOrder || 'desc' };
  } else if (sortBy === 'isUrgent') {
    orderBy = { isUrgent: 'desc' };
  } else if (sortBy === 'createdAt') {
    orderBy = { createdAt: sortOrder || 'desc' };
  }

  const [loads, total] = await prisma.$transaction([
    prisma.brokerLoad.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: { select: { quotes: true } }
      },
      orderBy,
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
    if (!profile || !profile.isKycVerified) {
      throw AppError.forbidden('KYC Verification Required. Please complete your agent KYC and await admin verification before submitting quotes.');
    }
    const created = await tx.brokerQuote.create({
      data: {
        loadId,
        brokerId: profile.id,
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
  const { page, limit, search, isKycVerified, isActive, city, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (isKycVerified !== undefined && isKycVerified !== 'all' && isKycVerified !== '') {
    where.isKycVerified = isKycVerified === 'true' || isKycVerified === 'verified';
  }
  if (isActive !== undefined && isActive !== 'all' && isActive !== '') {
    where.isActive = isActive === 'true' || isActive === 'active';
  }
  if (city) {
    where.primaryCity = { contains: city, mode: 'insensitive' };
  }
  if (search) {
    where.OR = [
      { primaryCity: { contains: search, mode: 'insensitive' } },
      { primaryState: { contains: search, mode: 'insensitive' } },
      { panNumber: { contains: search, mode: 'insensitive' } },
      { referralCode: { contains: search, mode: 'insensitive' } },
      {
        user: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }

  let orderBy: any = { createdAt: sortOrder || 'desc' };
  if (sortBy === 'totalLoadsFulfilled') {
    orderBy = { totalLoadsFulfilled: sortOrder || 'desc' };
  } else if (sortBy === 'totalBountiesEarned') {
    orderBy = { totalBountiesEarned: sortOrder || 'desc' };
  } else if (sortBy === 'successRate') {
    orderBy = { successRate: sortOrder || 'desc' };
  } else if (sortBy === 'name') {
    orderBy = { user: { name: sortOrder || 'asc' } };
  }

  const [agents, total] = await prisma.$transaction([
    prisma.brokerProfile.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, createdAt: true, isActive: true, profileImageUrl: true } },
        _count: { select: { quotes: true, driverRetentions: true } },
      },
      orderBy,
    }),
    prisma.brokerProfile.count({ where }),
  ]);

  const formattedAgents = agents.map((agent) => ({
    ...agent,
    profilePhotoUrl: agent.profilePhotoUrl || agent.user?.profileImageUrl || null,
    user: {
      ...agent.user,
      name: agent.user?.name || (agent.user?.phone ? `Agent (${agent.user.phone.slice(-4)})` : 'GMT Agent'),
      profileImageUrl: agent.user?.profileImageUrl || agent.profilePhotoUrl || null,
    },
  }));

  return { agents: formattedAgents, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getAdminAgentById(agentId: string) {
  const agent = await prisma.brokerProfile.findUnique({
    where: { id: agentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          createdAt: true,
          isActive: true,
          profileImageUrl: true,
        },
      },
      quotes: {
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          load: {
            select: {
              id: true,
              pickupCity: true,
              dropCity: true,
              vehicleType: true,
              brokerStatus: true,
              customerBudget: true,
            },
          },
          bountyLedger: true,
        },
      },
      driverRetentions: {
        take: 15,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          quotes: true,
          driverRetentions: true,
        },
      },
    },
  });

  if (!agent) throw AppError.notFound('Agent profile not found');
  return agent;
}

export async function adminCreateAgent(adminUserId: string, data: AdminCreateAgentInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check if user with phone already exists
    let user = await tx.user.findUnique({
      where: { phone: data.phone },
      include: { brokerProfile: true },
    });

    if (user?.brokerProfile) {
      throw AppError.badRequest('A transport agent profile is already registered with this phone number', 'AGENT_ALREADY_EXISTS');
    }

    if (data.email) {
      const emailUser = await tx.user.findUnique({ where: { email: data.email } });
      if (emailUser && emailUser.id !== user?.id) {
        throw AppError.badRequest('This email is already in use by another account', 'EMAIL_TAKEN');
      }
    }

    if (!user) {
      user = await tx.user.create({
        data: {
          phone: data.phone,
          name: data.name,
          email: data.email || null,
          role: UserRole.MIDDLEMAN,
          profileImageUrl: data.profilePhotoUrl || null,
          profileComplete: true,
          isActive: data.isActive !== false,
        },
        include: { brokerProfile: true },
      });
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          name: data.name || user.name,
          email: data.email || user.email,
          profileImageUrl: data.profilePhotoUrl || user.profileImageUrl,
          role: UserRole.MIDDLEMAN,
          profileComplete: true,
          isActive: data.isActive !== false,
        },
        include: { brokerProfile: true },
      });
    }

    const aadhaarLast4 = data.aadhaarNumber && data.aadhaarNumber.length >= 4
      ? data.aadhaarNumber.slice(-4)
      : null;

    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const referralCode = `AGT-${randomSuffix}`;

    const profile = await tx.brokerProfile.create({
      data: {
        userId: user.id,
        primaryCity: data.primaryCity,
        primaryState: data.primaryState || null,
        operatingCities: data.operatingCities && data.operatingCities.length > 0 ? data.operatingCities : [data.primaryCity],
        
        age: data.age ?? null,
        gender: data.gender || null,
        educationLevel: data.educationLevel || null,
        fullAddress: data.fullAddress || null,
        profilePhotoUrl: data.profilePhotoUrl || null,

        aadhaarNumber: data.aadhaarNumber || null,
        aadhaarLast4,
        aadhaarDocUrl: data.aadhaarDocUrl || null,
        panNumber: data.panNumber || null,
        panDocUrl: data.panDocUrl || null,

        bankAccountNumber: data.bankAccountNumber || null,
        bankIfsc: data.bankIfsc || null,
        bankName: data.bankName || null,
        bankAccountHolderName: data.bankAccountHolderName || null,
        bankUpiId: data.bankUpiId || null,

        isKycVerified: Boolean(data.isKycVerified),
        kycVerifiedAt: data.isKycVerified ? new Date() : null,
        isActive: data.isActive !== false,
        adminNotes: data.adminNotes || null,
        referralCode,
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, createdAt: true, isActive: true } },
      },
    });

    return profile;
  });
}

export async function adminUpdateAgent(agentId: string, adminUserId: string, data: AdminUpdateAgentInput) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.brokerProfile.findUnique({
      where: { id: agentId },
      include: { user: true },
    });
    if (!existing) throw AppError.notFound('Agent profile not found');

    if (data.name !== undefined || data.email !== undefined || data.profilePhotoUrl !== undefined || data.isActive !== undefined) {
      if (data.email && data.email !== existing.user.email) {
        const emailUser = await tx.user.findUnique({ where: { email: data.email } });
        if (emailUser && emailUser.id !== existing.userId) {
          throw AppError.badRequest('Email is already registered with another account', 'EMAIL_TAKEN');
        }
      }
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          name: data.name ?? existing.user.name,
          email: data.email ?? existing.user.email,
          profileImageUrl: data.profilePhotoUrl !== undefined ? data.profilePhotoUrl : existing.user.profileImageUrl,
          isActive: data.isActive !== undefined ? data.isActive : existing.user.isActive,
        },
      });
    }

    const aadhaarLast4 = data.aadhaarNumber && data.aadhaarNumber.length >= 4
      ? data.aadhaarNumber.slice(-4)
      : (data.aadhaarNumber === '' ? null : existing.aadhaarLast4);

    const updatedProfile = await tx.brokerProfile.update({
      where: { id: agentId },
      data: {
        primaryCity: data.primaryCity !== undefined ? data.primaryCity : existing.primaryCity,
        primaryState: data.primaryState !== undefined ? data.primaryState : existing.primaryState,
        operatingCities: data.operatingCities !== undefined ? data.operatingCities : existing.operatingCities,
        age: data.age !== undefined ? data.age : existing.age,
        gender: data.gender !== undefined ? data.gender : existing.gender,
        educationLevel: data.educationLevel !== undefined ? data.educationLevel : existing.educationLevel,
        fullAddress: data.fullAddress !== undefined ? data.fullAddress : existing.fullAddress,
        profilePhotoUrl: data.profilePhotoUrl !== undefined ? data.profilePhotoUrl : existing.profilePhotoUrl,
        aadhaarNumber: data.aadhaarNumber !== undefined ? data.aadhaarNumber : existing.aadhaarNumber,
        aadhaarLast4,
        aadhaarDocUrl: data.aadhaarDocUrl !== undefined ? data.aadhaarDocUrl : existing.aadhaarDocUrl,
        panNumber: data.panNumber !== undefined ? data.panNumber : existing.panNumber,
        panDocUrl: data.panDocUrl !== undefined ? data.panDocUrl : existing.panDocUrl,
        bankAccountNumber: data.bankAccountNumber !== undefined ? data.bankAccountNumber : existing.bankAccountNumber,
        bankIfsc: data.bankIfsc !== undefined ? data.bankIfsc : existing.bankIfsc,
        bankName: data.bankName !== undefined ? data.bankName : existing.bankName,
        bankAccountHolderName: data.bankAccountHolderName !== undefined ? data.bankAccountHolderName : existing.bankAccountHolderName,
        bankUpiId: data.bankUpiId !== undefined ? data.bankUpiId : existing.bankUpiId,
        adminNotes: data.adminNotes !== undefined ? data.adminNotes : existing.adminNotes,
        isKycVerified: data.isKycVerified !== undefined ? data.isKycVerified : existing.isKycVerified,
        kycVerifiedAt: data.isKycVerified !== undefined
          ? (data.isKycVerified ? (existing.kycVerifiedAt || new Date()) : null)
          : existing.kycVerifiedAt,
        isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, createdAt: true, isActive: true } },
      },
    });

    return updatedProfile;
  });
}

export async function adminToggleAgentStatus(agentId: string, adminUserId: string, data: AdminAgentStatusInput) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.brokerProfile.findUnique({ where: { id: agentId } });
    if (!existing) throw AppError.notFound('Agent profile not found');

    const updated = await tx.brokerProfile.update({
      where: { id: agentId },
      data: {
        isActive: data.isActive,
        adminNotes: data.reason ? `${existing.adminNotes || ''}\n[Status Change]: ${data.reason}`.trim() : existing.adminNotes,
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, createdAt: true, isActive: true } },
      },
    });

    await tx.user.update({
      where: { id: existing.userId },
      data: { isActive: data.isActive },
    });

    return updated;
  });
}

export async function adminDeleteAgent(agentId: string, adminUserId: string) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.brokerProfile.findUnique({
      where: { id: agentId },
      include: {
        quotes: {
          where: {
            status: { in: [BrokerQuoteStatus.PENDING, BrokerQuoteStatus.OPS_REVIEW, BrokerQuoteStatus.ACCEPTED] },
          },
        },
      },
    });
    if (!existing) throw AppError.notFound('Agent profile not found');

    if (existing.quotes && existing.quotes.length > 0) {
      throw AppError.badRequest('Cannot delete agent with active or accepted quotes. Mark the agent inactive instead.', 'AGENT_HAS_ACTIVE_QUOTES');
    }

    await tx.brokerProfile.delete({ where: { id: agentId } });
    return { success: true, message: 'Agent deleted successfully' };
  });
}

export async function adminBulkDeleteAgents(adminUserId: string, data: AdminBulkDeleteAgentsInput) {
  const { ids } = data;
  let deletedCount = 0;
  let skippedCount = 0;

  for (const agentId of ids) {
    try {
      await adminDeleteAgent(agentId, adminUserId);
      deletedCount++;
    } catch {
      skippedCount++;
    }
  }

  return { deletedCount, skippedCount, totalProcessed: ids.length };
}

export async function updateAgentKyc(agentId: string, opsUserId: string, data: UpdateAgentKycInput) {
  const profile = await prisma.brokerProfile.findUnique({ where: { id: agentId }, include: { user: true } });
  if (!profile) throw AppError.notFound('Agent profile not found');

  const updated = await prisma.brokerProfile.update({
    where: { id: agentId },
    data: {
      isKycVerified: data.isKycVerified,
      kycVerifiedAt: data.isKycVerified ? new Date() : null,
      adminNotes: data.notes ? `${profile.adminNotes || ''}\n[KYC Update]: ${data.notes}`.trim() : profile.adminNotes,
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

export async function getAgentProfile(userId: string) {
  let profile = await prisma.brokerProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, phone: true, email: true, createdAt: true, profileImageUrl: true } },
      _count: { select: { quotes: true, driverRetentions: true } },
    }
  });

  if (!profile) {
    profile = await prisma.brokerProfile.create({
      data: {
        userId,
        isActive: true,
        isKycVerified: false,
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, createdAt: true, profileImageUrl: true } },
        _count: { select: { quotes: true, driverRetentions: true } },
      }
    });
  }

  return profile;
}

export async function updateAgentProfile(userId: string, data: {
  name?: string;
  email?: string;
  primaryCity?: string;
  primaryState?: string;
  operatingCities?: string[];
  age?: number;
  gender?: string;
  educationLevel?: string;
  fullAddress?: string;
  profilePhotoUrl?: string;
  aadhaarNumber?: string;
  aadhaarLast4?: string;
  aadhaarDocUrl?: string;
  panNumber?: string;
  panDocUrl?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  bankAccountHolderName?: string;
  bankUpiId?: string;
  isKycVerified?: boolean;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Sync User profile fields if provided
    if (data.name || data.email || data.profilePhotoUrl) {
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
          ...(data.profilePhotoUrl && { profileImageUrl: data.profilePhotoUrl }),
        },
      });
    }

    const aadhaarLast4 = data.aadhaarLast4 || (data.aadhaarNumber && data.aadhaarNumber.length >= 4 ? data.aadhaarNumber.slice(-4) : undefined);

    const updateFields: any = {
      ...(data.primaryCity !== undefined && { primaryCity: data.primaryCity }),
      ...(data.primaryState !== undefined && { primaryState: data.primaryState }),
      ...(data.operatingCities !== undefined && { operatingCities: data.operatingCities }),
      ...(data.age !== undefined && { age: Number(data.age) || null }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.educationLevel !== undefined && { educationLevel: data.educationLevel }),
      ...(data.fullAddress !== undefined && { fullAddress: data.fullAddress }),
      ...(data.profilePhotoUrl !== undefined && { profilePhotoUrl: data.profilePhotoUrl }),
      ...(data.aadhaarNumber !== undefined && { aadhaarNumber: data.aadhaarNumber }),
      ...(aadhaarLast4 !== undefined && { aadhaarLast4 }),
      ...(data.aadhaarDocUrl !== undefined && { aadhaarDocUrl: data.aadhaarDocUrl }),
      ...(data.panNumber !== undefined && { panNumber: data.panNumber.toUpperCase() }),
      ...(data.panDocUrl !== undefined && { panDocUrl: data.panDocUrl }),
      ...(data.bankAccountNumber !== undefined && { bankAccountNumber: data.bankAccountNumber }),
      ...(data.bankIfsc !== undefined && { bankIfsc: data.bankIfsc.toUpperCase() }),
      ...(data.bankName !== undefined && { bankName: data.bankName }),
      ...(data.bankAccountHolderName !== undefined && { bankAccountHolderName: data.bankAccountHolderName }),
      ...(data.bankUpiId !== undefined && { bankUpiId: data.bankUpiId }),
      ...(data.isKycVerified !== undefined && { isKycVerified: data.isKycVerified }),
    };

    const profile = await tx.brokerProfile.upsert({
      where: { userId },
      update: updateFields,
      create: {
        userId,
        isActive: true,
        isKycVerified: false,
        ...updateFields,
      },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, profileImageUrl: true } },
        _count: { select: { quotes: true, driverRetentions: true } },
      }
    });

    return profile;
  });
}

export async function getAgentWallet(userId: string) {
  const profile = await prisma.brokerProfile.findUnique({ where: { userId } });
  if (!profile) {
    return {
      totalEarned: 0,
      pendingBounties: 0,
      settledCount: 0,
      pendingCount: 0,
      transactions: [],
    };
  }

  const ledgers = await prisma.brokerBountyLedger.findMany({
    where: { brokerId: profile.id },
    include: {
      quote: {
        include: {
          load: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const settled = ledgers.filter((l) => l.settlementStatus === BountySettlementStatus.MANUALLY_SETTLED);
  const pending = ledgers.filter((l) => l.settlementStatus === BountySettlementStatus.PENDING || l.settlementStatus === BountySettlementStatus.ELIGIBLE);

  const totalEarned = settled.reduce((sum, item) => sum + (item.bountyAmount || 0), 0);
  const pendingBounties = pending.reduce((sum, item) => sum + (item.bountyAmount || 0), 0);

  return {
    totalEarned,
    pendingBounties,
    settledCount: settled.length,
    pendingCount: pending.length,
    transactions: ledgers.map((l) => ({
      id: l.id,
      loadId: l.quote?.loadId || 'N/A',
      city: `${l.quote?.load?.pickupCity || 'Origin'} → ${l.quote?.load?.dropCity || 'Destination'}`,
      amount: l.bountyAmount,
      date: l.createdAt.toISOString().slice(0, 10),
      status: l.settlementStatus,
      isSettled: l.settlementStatus === BountySettlementStatus.MANUALLY_SETTLED,
    })),
  };
}

export async function getAgentTracking(userId: string) {
  const profile = await prisma.brokerProfile.findUnique({ where: { userId } });
  
  const quotes = profile ? await prisma.brokerQuote.findMany({
    where: {
      brokerId: profile.id,
      status: { in: [BrokerQuoteStatus.ACCEPTED, BrokerQuoteStatus.OPS_REVIEW, BrokerQuoteStatus.PENDING] }
    },
    include: {
      load: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  }) : [];

  const trackedQuotes = quotes.map((q) => ({
    id: q.load.id,
    status: q.load.brokerStatus,
    pickup: q.load.pickupCity,
    drop: q.load.dropCity,
    pickupAddress: q.load.pickupAddress,
    dropAddress: q.load.dropAddress,
    driverPhone: q.driverPhone,
    driverName: q.driverName || 'Assigned Driver',
    vehicle: q.vehicleRegNo,
    vehicleType: q.load.vehicleType,
    loadingOtp: q.load.loadingOtp,
    negotiatedAmount: q.negotiatedAmount,
    flatFeeBounty: q.flatFeeBounty,
    createdAt: q.load.createdAt,
  }));

  if (trackedQuotes.length === 0) {
    const activeLoads = await prisma.brokerLoad.findMany({
      where: {
        brokerStatus: { in: [BrokerBookingStatus.BOOKING_LOCKED, BrokerBookingStatus.LOADING_CONFIRMED, BrokerBookingStatus.TRIP_COMPLETED] }
      },
      include: {
        quotes: { take: 1 }
      },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });

    return activeLoads.map((l) => ({
      id: l.id,
      status: l.brokerStatus,
      pickup: l.pickupCity,
      drop: l.dropCity,
      pickupAddress: l.pickupAddress,
      dropAddress: l.dropAddress,
      driverPhone: l.quotes[0]?.driverPhone || '9876543210',
      driverName: l.quotes[0]?.driverName || 'Driver Partner',
      vehicle: l.quotes[0]?.vehicleRegNo || 'Commercial Vehicle',
      vehicleType: l.vehicleType,
      loadingOtp: l.loadingOtp,
      negotiatedAmount: l.quotes[0]?.negotiatedAmount || l.customerBudget,
      flatFeeBounty: l.quotes[0]?.flatFeeBounty || 500,
      createdAt: l.createdAt,
    }));
  }

  return trackedQuotes;
}

