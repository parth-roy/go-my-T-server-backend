import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';
import type {
  UpdateProfileInput,
  AddAddressInput,
  UpdateAddressInput,
  AddGstInput,
} from './user.schema';


// ─────────────────────────────────────────────
// 
// PROFILE
// 

export async function getStats(userId: string) {
  const totalBookings = await prisma.booking.count({
    where: { customerId: userId }
  });

  const completedBookings = await prisma.booking.count({
    where: { 
      customerId: userId, 
      status: { in: ['COMPLETED', 'DELIVERED'] }
    }
  });

  // 1. Rolling 4 Months Analytics for Workers Hired
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabels: string[] = [];
  const monthlyData: number[] = [];

  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    monthLabels.push(monthNames[d.getMonth()]);

    const gigWorkersSum = await prisma.gigJob.aggregate({
      where: {
        customerId: userId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['COMPLETED', 'IN_PROGRESS', 'ASSIGNED', 'PENDING'] }
      },
      _sum: { workersNeeded: true }
    });

    const bookingLabourSum = await prisma.booking.aggregate({
      where: {
        customerId: userId,
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      },
      _sum: { laborersCount: true }
    });

    const count = (gigWorkersSum._sum?.workersNeeded ?? 0) + (bookingLabourSum._sum?.laborersCount ?? 0);
    monthlyData.push(count);
  }

  // Calculate current total and month-over-month growth
  const currentMonthWorkers = monthlyData[3];
  const prevMonthWorkers = monthlyData[2];
  let growthText = '0% vs last month';

  if (prevMonthWorkers > 0) {
    const growth = Math.round(((currentMonthWorkers - prevMonthWorkers) / prevMonthWorkers) * 100);
    growthText = growth >= 0 ? `↑ ${growth}% vs last month` : `↓ ${Math.abs(growth)}% vs last month`;
  } else if (currentMonthWorkers > 0) {
    growthText = '↑ 100% vs last month';
  } else {
    growthText = '0% vs last month';
  }

  // 2. Calculate Average Response Time
  const responseAssignments = await prisma.gigAssignment.findMany({
    where: {
      gig: { customerId: userId },
      status: { in: ['COMPLETED', 'IN_PROGRESS', 'ARRIVED', 'ACCEPTED'] },
      arrivedAt: { not: null }
    },
    select: {
      createdAt: true,
      arrivedAt: true
    },
    take: 20
  });

  let displayAvgResponse = '0m';
  let avgResponseProgress = 0.0;
  let improvementText = 'No active jobs';

  if (responseAssignments.length > 0) {
    let totalMinutes = 0;
    for (const a of responseAssignments) {
      if (a.arrivedAt && a.createdAt) {
        const diffMs = Math.max(0, a.arrivedAt.getTime() - a.createdAt.getTime());
        totalMinutes += diffMs / (1000 * 60);
      }
    }
    const avgMin = totalMinutes / responseAssignments.length;
    if (avgMin < 60) {
      displayAvgResponse = `${Math.max(1, Math.round(avgMin))}m`;
      avgResponseProgress = Math.min(1.0, Math.max(0.1, avgMin / 60.0));
      improvementText = 'Faster than avg';
    } else {
      const avgHours = Math.round((avgMin / 60) * 10) / 10;
      displayAvgResponse = `${avgHours}h`;
      avgResponseProgress = Math.max(0.1, Math.min(1.0, 1.0 - (avgHours / 48.0)));
      improvementText = `${avgHours}h average`;
    }
  }

  // 3. Calculate Average Rating & Reviews
  const ratingAgg = await prisma.booking.aggregate({
    where: { customerId: userId, customerRating: { not: null } },
    _avg: { customerRating: true },
    _count: { customerRating: true }
  });

  const rating = ratingAgg._avg.customerRating ? Number(ratingAgg._avg.customerRating.toFixed(1)) : 0.0;
  const totalReviews = ratingAgg._count.customerRating ?? 0;

  return {
    totalBookings,
    completedBookings,
    rating,
    totalReviews,
    workersHired: {
      totalThisMonth: currentMonthWorkers,
      growthText,
      monthlyData: monthlyData,
      monthLabels
    },
    avgResponse: {
      displayTime: displayAvgResponse,
      progress: avgResponseProgress,
      improvementText
    },
    avgRating: {
      rating,
      totalReviews
    }
  };
}

// ─────────────────────────────────────────────

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      profileImageUrl: true,
      role: true,
      language: true,
      isActive: true,
      createdAt: true,
      usageType: true,
      whatsappOptIn: true,
      profileComplete: true,
      // ── Driver onboarding resume data ─────────────────────────────
      // Expose minimal driver fields for the router to determine resume step.
      // Never expose: dob, sensitive verification payloads.
      driver: {
        select: {
          id: true,
          dlNumber: true,
          isDocVerified: true,
          // Vehicle is 1:1 with driver (not directly on User)
          vehicle: {
            select: {
              id: true,
              registrationNo: true,
              status: true,
            },
          },
        },
      },
      // ── Worker onboarding resume data ─────────────────────────────
      worker: {
        select: {
          id: true,
          isDocVerified: true,
          aadhaarVerifStatus: true,
          panVerifStatus: true,
        },
      },
      // Never expose: fcmToken, refreshTokens
    },
  });

  if (!user) throw AppError.notFound('User not found');
  return user;
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  // If no fields were sent, do nothing
  if (Object.keys(data).length === 0) {
    return getProfile(userId);
  }

  const { consentToLinkEmail, ...updateData } = data;

  // If updating email, check for cross-role or duplicate existence
  if (updateData.email) {
    const normalizedEmail = updateData.email.trim().toLowerCase();
    updateData.email = normalizedEmail;

    const existingUserWithEmail = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: userId },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
      },
    });

    if (existingUserWithEmail) {
      if (consentToLinkEmail !== true) {
        throw new AppError(
          `The email ${normalizedEmail} is already associated with a ${existingUserWithEmail.role} account.`,
          409,
          'EMAIL_EXISTS_CROSS_ROLE',
          true,
          {
            email: normalizedEmail,
            existingRole: existingUserWithEmail.role,
            existingName: existingUserWithEmail.name,
            message: `This email is already registered with a ${existingUserWithEmail.role} account on MetroMitra. Do you declare and consent to link this email to your account?`,
          }
        );
      }

      // User gave explicit declaration and consent to link/reassign this email
      await prisma.user.update({
        where: { id: existingUserWithEmail.id },
        data: { email: null },
      });
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      profileImageUrl: true,
      role: true,
      language: true,
      isActive: true,
      createdAt: true,
      usageType: true,
      whatsappOptIn: true,
      profileComplete: true,
    },
  });

  return updated;
}

/**
 * Update only the profileImageUrl for a user.
 * Called after a successful upload to DO Spaces.
 * Returns the updated user profile (same shape as getProfile).
 */
export async function updateProfileImage(userId: string, imageUrl: string) {
  if (!imageUrl || !imageUrl.startsWith('https://')) {
    throw AppError.badRequest('Invalid image URL');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { profileImageUrl: imageUrl },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      profileImageUrl: true,
      role: true,
      language: true,
      isActive: true,
      createdAt: true,
      usageType: true,
      whatsappOptIn: true,
      profileComplete: true,
    },
  });

  return updated;
}


// ─────────────────────────────────────────────
// ADDRESSES
// ─────────────────────────────────────────────

export async function getAddresses(userId: string) {
  return prisma.savedAddress.findMany({
    where: { userId },
    orderBy: [
      { isDefault: 'desc' }, // default address always first
      { createdAt: 'desc' },
    ],
  });
}

export async function addAddress(userId: string, data: AddAddressInput) {
  // If this address is being set as default, unset all existing defaults first
  if (data.isDefault) {
    await prisma.savedAddress.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  // If this is the user's very first address, auto-set as default
  const existingCount = await prisma.savedAddress.count({ where: { userId } });
  const isDefault = existingCount === 0 ? true : data.isDefault;

  return prisma.savedAddress.create({
    data: { ...data, isDefault, userId },
  });
}

export async function updateAddress(
  userId: string,
  addressId: string,
  data: UpdateAddressInput
) {
  // Verify ownership — never trust the client to only send their own IDs
  const address = await prisma.savedAddress.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) throw AppError.notFound('Address not found');

  if (data.isDefault === true) {
    // Unset all other defaults before setting this one
    await prisma.savedAddress.updateMany({
      where: { userId, id: { not: addressId } },
      data: { isDefault: false },
    });
  }

  return prisma.savedAddress.update({
    where: { id: addressId },
    data,
  });
}

export async function deleteAddress(userId: string, addressId: string) {
  const address = await prisma.savedAddress.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) throw AppError.notFound('Address not found');

  await prisma.savedAddress.delete({ where: { id: addressId } });

  // If we just deleted the default address, promote the most recent one
  if (address.isDefault) {
    const next = await prisma.savedAddress.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (next) {
      await prisma.savedAddress.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return { message: 'Address deleted' };
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const address = await prisma.savedAddress.findFirst({
    where: { id: addressId, userId },
  });
  if (!address) throw AppError.notFound('Address not found');

  // Unset all, then set this one — single transaction
  await prisma.$transaction([
    prisma.savedAddress.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.savedAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    }),
  ]);

  return prisma.savedAddress.findUnique({ where: { id: addressId } });
}

// ─────────────────────────────────────────────
// GST DETAILS
// ─────────────────────────────────────────────

export async function getGstDetails(userId: string) {
  return prisma.gstDetail.findMany({
    where: { userId },
    orderBy: [
      { isPrimary: 'desc' }, // primary GST first
      { createdAt: 'desc' },
    ],
  });
}

export async function addGstDetail(userId: string, data: AddGstInput) {
  // Check for duplicate GSTIN for this user
  const existing = await prisma.gstDetail.findFirst({
    where: { userId, gstin: data.gstin },
  });
  if (existing) {
    throw AppError.conflict('This GSTIN is already saved', 'GST_DUPLICATE');
  }

  // First GST detail auto-becomes primary
  const existingCount = await prisma.gstDetail.count({ where: { userId } });
  const isPrimary = existingCount === 0;

  return prisma.gstDetail.create({
    data: { ...data, userId, isPrimary },
  });
}

export async function deleteGstDetail(userId: string, gstId: string) {
  const gst = await prisma.gstDetail.findFirst({
    where: { id: gstId, userId },
  });
  if (!gst) throw AppError.notFound('GST detail not found');

  await prisma.gstDetail.delete({ where: { id: gstId } });

  // If deleted one was primary, promote the most recent remaining one
  if (gst.isPrimary) {
    const next = await prisma.gstDetail.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (next) {
      await prisma.gstDetail.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  return { message: 'GST detail deleted' };
}

export async function setPrimaryGst(userId: string, gstId: string) {
  const gst = await prisma.gstDetail.findFirst({
    where: { id: gstId, userId },
  });
  if (!gst) throw AppError.notFound('GST detail not found');

  await prisma.$transaction([
    prisma.gstDetail.updateMany({
      where: { userId },
      data: { isPrimary: false },
    }),
    prisma.gstDetail.update({
      where: { id: gstId },
      data: { isPrimary: true },
    }),
  ]);

  return prisma.gstDetail.findUnique({ where: { id: gstId } });
}

// ─────────────────────────────────────────────
// TEAM MEMBERS (ENTERPRISE)
// ─────────────────────────────────────────────

export async function getTeamMembers(userId: string) {
  return prisma.teamMember.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addTeamMember(userId: string, data: any) {
  // Prevent duplicate phone numbers in the team
  const existing = await prisma.teamMember.findFirst({
    where: { ownerId: userId, phone: data.phone },
  });
  if (existing) {
    throw AppError.conflict('A team member with this phone number already exists', 'TEAM_DUPLICATE');
  }

  return prisma.teamMember.create({
    data: { ...data, ownerId: userId },
  });
}

export async function updateTeamMember(userId: string, memberId: string, data: any) {
  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, ownerId: userId },
  });
  if (!member) throw AppError.notFound('Team member not found');

  return prisma.teamMember.update({
    where: { id: memberId },
    data,
  });
}

export async function deleteTeamMember(userId: string, memberId: string) {
  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, ownerId: userId },
  });
  if (!member) throw AppError.notFound('Team member not found');

  await prisma.teamMember.delete({ where: { id: memberId } });
  return { message: 'Team member removed' };
}

// ─────────────────────────────────────────────
// VERIFIED WORKERS DIRECTORY (FOR HIRER / CUSTOMER)
// ─────────────────────────────────────────────

export interface GetVerifiedWorkersQuery {
  state?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function parseWorkerSkills(preferredWork: string | null): string[] {
  if (!preferredWork) return ['General Maintenance'];
  const trimmed = preferredWork.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
        return parsed.skills
          .map((s: any) => String(s).replace(/["{}\[\]]/g, '').trim())
          .filter(Boolean);
      }
    } catch (_) {}
  }

  const parts = trimmed
    .split(/,\s*/)
    .map((s) => s.replace(/["{}\[\]]/g, '').trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !s.includes(':') &&
        !['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(s)
    );

  const cleanMap: Record<string, string> = {
    packer: 'Packer & Mover',
    'loader-unloader': 'Loading & Unloading',
    'general-helper': 'General Helper',
    'security-guard': 'Security Guard',
    electrician: 'Electrician',
    'All Types': 'Multi-Skilled Technician',
    Residential: 'Residential Services',
    Commercial: 'Commercial Maintenance',
    Industrial: 'Industrial Workforce',
    Plumbing: 'Plumbing',
    Cleaning: 'Cleaning & Janitorial',
    Housekeeping: 'Housekeeping',
    'AC Repair': 'AC Technician',
  };

  const mapped = parts.map((p) => cleanMap[p] || p);
  return mapped.length > 0 ? mapped : ['Skilled Professional'];
}

export async function getVerifiedWorkers(query: GetVerifiedWorkersQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 100));

  // Filter ONLY admin-verified workers who onboarded from app/website
  // isDocVerified: true
  const baseWhere: any = {
    isActive: true,
    isDocVerified: true,
    user: {
      isActive: true,
    },
  };

  const allVerifiedWorkers = await prisma.worker.findMany({
    where: baseWhere,
    orderBy: [
      { rating: 'desc' },
      { totalJobs: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          profileImageUrl: true,
          role: true,
          createdAt: true,
          addresses: {
            select: {
              id: true,
              label: true,
              addressLine1: true,
              city: true,
              state: true,
              pincode: true,
              isDefault: true,
            },
          },
        },
      },
      workerBadges: {
        include: {
          badge: true,
        },
      },
    },
  });

  // Cross-reference location from FormGigLead where user phone matches
  const phones = allVerifiedWorkers
    .map((w) => w.user.phone)
    .filter(Boolean) as string[];

  const leads = await prisma.formGigLead.findMany({
    where: { phone: { in: phones } },
    select: { phone: true, city: true, givenState: true },
  });

  const phoneToLocation = new Map<string, { city: string; state: string }>();
  for (const l of leads) {
    if (!phoneToLocation.has(l.phone)) {
      phoneToLocation.set(l.phone, {
        city: l.city,
        state: l.givenState || l.city,
      });
    }
  }

  const stateSet = new Set<string>();
  const categorySet = new Set<string>();

  // Resolve clean location and skills for all verified workers
  const resolvedList = allVerifiedWorkers.map((w) => {
    const primaryAddress =
      w.user.addresses.find((a) => a.isDefault) || w.user.addresses[0];

    let city = 'Kolkata';
    let state = 'West Bengal';

    if (
      primaryAddress &&
      primaryAddress.state &&
      primaryAddress.state !== 'Unknown' &&
      primaryAddress.state.trim().length > 0
    ) {
      city = primaryAddress.city || city;
      state = primaryAddress.state.trim();
    } else if (w.user.phone && phoneToLocation.has(w.user.phone)) {
      const match = phoneToLocation.get(w.user.phone)!;
      city = match.city || city;
      state = match.state || state;
    } else if (w.preferredWork && w.preferredWork.startsWith('{')) {
      try {
        const parsed = JSON.parse(w.preferredWork);
        if (parsed.workAreaLocality) {
          city = parsed.workAreaLocality;
          state = 'Maharashtra';
        }
      } catch (_) {}
    } else if (w.currentLat && w.currentLng) {
      if (w.currentLat > 28 && w.currentLat < 29) {
        city = 'New Delhi';
        state = 'Delhi';
      } else if (w.currentLat > 18 && w.currentLat < 20) {
        city = 'Mumbai';
        state = 'Maharashtra';
      } else if (w.currentLat > 12 && w.currentLat < 14) {
        city = 'Bengaluru';
        state = 'Karnataka';
      } else if (w.currentLat > 17 && w.currentLat < 18) {
        city = 'Hyderabad';
        state = 'Telangana';
      }
    }

    stateSet.add(state);

    const categories = parseWorkerSkills(w.preferredWork);
    for (const c of categories) {
      categorySet.add(c);
    }

    return {
      id: w.id,
      userId: w.userId,
      name: w.user.name || 'Verified Professional',
      phone: w.user.phone || '',
      email: w.user.email || '',
      profileImageUrl: w.user.profileImageUrl || '',
      rating: w.rating || 5.0,
      totalJobs: w.totalJobs || 0,
      acceptanceRate: w.acceptanceRate || 100.0,
      status: w.status,
      isDocVerified: w.isDocVerified,
      categories,
      primaryCategory: categories[0] || 'Technician',
      state,
      city,
      addressLine: primaryAddress?.addressLine1 || '',
      languages: w.languages || ['Hindi', 'English'],
      availableTime: w.availableTime || '8:00 AM - 8:00 PM',
      badges: w.workerBadges.map((b) => b.badge.name),
      joinedAt: w.user.createdAt,
    };
  });

  // Apply State, Category, and Search filtering
  let filtered = resolvedList;

  if (query.state && query.state.trim().toLowerCase() !== 'all') {
    const qState = query.state.trim().toLowerCase();
    filtered = filtered.filter((w) => w.state.toLowerCase().includes(qState));
  }

  if (query.category && query.category.trim().toLowerCase() !== 'all') {
    const qCat = query.category.trim().toLowerCase();
    filtered = filtered.filter((w) =>
      w.categories.some((c) => c.toLowerCase().includes(qCat))
    );
  }

  if (query.search && query.search.trim().length > 0) {
    const s = query.search.trim().toLowerCase();
    filtered = filtered.filter(
      (w) =>
        w.name.toLowerCase().includes(s) ||
        w.phone.includes(s) ||
        w.city.toLowerCase().includes(s) ||
        w.state.toLowerCase().includes(s) ||
        w.categories.some((c) => c.toLowerCase().includes(s))
    );
  }

  const total = filtered.length;
  const skip = (page - 1) * limit;
  const paginatedWorkers = filtered.slice(skip, skip + limit);

  return {
    workers: paginatedWorkers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    availableStates: Array.from(stateSet).sort(),
    availableCategories: Array.from(categorySet).sort(),
  };
}
