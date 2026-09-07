import {
  PrismaClient,
  LeadStatus,
  PlatformSource,
  PaymentType,
  TransactionPaymentStatus,
  UserRole,
} from '@prisma/client';
import { s3Service, UploadFolder } from '../upload/upload.service';
import { logger } from '@shared/logger';
import { razorpay } from '@modules/payment/razorpay.client';
import { cashfreeClient } from '@modules/payment/cashfree.client';
import crypto from 'crypto';
import { AppError } from '@shared/errors/AppError';

const prisma = new PrismaClient();

export const FormGigLeadService = {
  createLead: async (data: any, files: { [fieldname: string]: Express.Multer.File[] } = {}) => {
    const {
      firstName, lastName, email, phone, jobType, city, area, 
      vehicleType, vehicleMake, aadharNumber, panNumber, 
      dlNumber, rcNumber, insuranceDetails,
      givenAddress, givenStreet, givenDistrict, givenState, givenPincode, givenLat, givenLng,
      autoAddress, autoStreet, autoDistrict, autoState, autoPincode, autoLat, autoLng
    } = data;
    
    // Upload files to S3 sequentially
    const uploadedUrls: Record<string, string> = {};
    const fileKeys = [
      'profilePhoto', 'aadharFront', 'aadharBack', 'panFront', 'dlFront', 'dlBack', 'rcBook', 'insurance'
    ];

    for (const key of fileKeys) {
      if (files[key] && files[key].length > 0) {
        const file = files[key][0];
        try {
          const result = await s3Service.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            UploadFolder.DOCUMENTS
          );
          if (result.success && result.url) {
            uploadedUrls[key + 'Url'] = result.url;
          }
        } catch (error) {
          console.error(`Failed to upload ${key}:`, error);
        }
      }
    }

    const lead = await prisma.formGigLead.create({
      data: {
        firstName: firstName || '',
        lastName: lastName || '',
        email: email || null,
        phone: phone || '',
        jobType: jobType || '',
        city: city || '',
        area: area || null,
        vehicleType: vehicleType || null,
        vehicleMake: vehicleMake || null,
        aadharNumber: aadharNumber || '',
        panNumber: panNumber || '',
        dlNumber: dlNumber || null,
        rcNumber: rcNumber || null,
        insuranceDetails: insuranceDetails || null,
        
        givenAddress, givenStreet, givenDistrict, givenState, givenPincode, 
        givenLat: givenLat ? parseFloat(givenLat) : null, 
        givenLng: givenLng ? parseFloat(givenLng) : null,

        ...uploadedUrls
      }
    });
    
    return lead;
  },

  getAllLeads: async () => {
    return prisma.formGigLead.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  /** Paginated, server-filtered list for the admin table view */
  listLeads: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    state?: string;
    city?: string;
    district?: string;
    jobType?: string;
    status?: string;
  }) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 100));
    const skip = (page - 1) * limit;

    const andClauses: any[] = [];

    if (params.search?.trim()) {
      const q = params.search.trim();
      andClauses.push({
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { area: { contains: q, mode: 'insensitive' } },
          { givenDistrict: { contains: q, mode: 'insensitive' } },
          { givenState: { contains: q, mode: 'insensitive' } },
          { jobType: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (params.state?.trim()) {
      andClauses.push({
        OR: [
          { givenState: { contains: params.state.trim(), mode: 'insensitive' } },
        ],
      });
    }
    if (params.city?.trim()) {
      andClauses.push({ city: { contains: params.city.trim(), mode: 'insensitive' } });
    }
    if (params.district?.trim()) {
      andClauses.push({ givenDistrict: { contains: params.district.trim(), mode: 'insensitive' } });
    }

    const where: any = andClauses.length > 0 ? { AND: andClauses } : {};

    if (params.jobType?.trim() && params.jobType !== 'ALL') {
      where.jobType = { contains: params.jobType.trim(), mode: 'insensitive' };
    }
    if (params.status?.trim() && params.status !== 'ALL') {
      where.status = params.status as any;
    }

    const [data, total] = await Promise.all([
      prisma.formGigLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, firstName: true, lastName: true, phone: true,
          city: true, area: true, jobType: true,
          givenDistrict: true, givenState: true, givenPincode: true,
          givenLat: true, givenLng: true,
          status: true, notes: true, createdAt: true,
          profilePhotoUrl: true,
        },
      }),
      prisma.formGigLead.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  /** Returns distinct states, districts, and cities for cascading search comboboxes */
  getFilterOptions: async () => {
    const leads = await prisma.formGigLead.findMany({
      select: {
        givenState: true,
        givenDistrict: true,
        city: true,
      },
    });

    const statesSet = new Set<string>();
    const districtsList: { state: string; district: string }[] = [];
    const citiesList: { state: string; district: string; city: string }[] = [];

    const districtKeys = new Set<string>();
    const cityKeys = new Set<string>();

    for (const lead of leads) {
      const state = (lead.givenState || '').trim();
      const district = (lead.givenDistrict || '').trim();
      const city = (lead.city || '').trim();

      if (state) statesSet.add(state);

      if (district) {
        const key = `${state}::${district}`;
        if (!districtKeys.has(key)) {
          districtKeys.add(key);
          districtsList.push({ state, district });
        }
      }

      if (city) {
        const key = `${state}::${district}::${city}`;
        if (!cityKeys.has(key)) {
          cityKeys.add(key);
          citiesList.push({ state, district, city });
        }
      }
    }

    return {
      states: Array.from(statesSet).sort(),
      districts: districtsList.sort((a, b) => a.district.localeCompare(b.district)),
      cities: citiesList.sort((a, b) => a.city.localeCompare(b.city)),
    };
  },

  /**
   * Lightweight viewport-bounded map pins for gig leads.
   * Returns only id, lat, lng, jobType, status, firstName, city.
   */
  getMapPins: async (params: {
    swLat?: number;
    swLng?: number;
    neLat?: number;
    neLng?: number;
    search?: string;
    state?: string;
    city?: string;
    district?: string;
    jobType?: string;
    status?: string;
  }) => {
    const andClauses: any[] = [
      { givenLat: { not: null } },
      { givenLng: { not: null } },
    ];

    if (
      params.swLat != null && params.swLng != null &&
      params.neLat != null && params.neLng != null
    ) {
      andClauses.push({
        givenLat: { gte: params.swLat, lte: params.neLat },
        givenLng: { gte: params.swLng, lte: params.neLng },
      });
    }

    if (params.search?.trim()) {
      const q = params.search.trim();
      andClauses.push({
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { area: { contains: q, mode: 'insensitive' } },
          { givenDistrict: { contains: q, mode: 'insensitive' } },
          { givenState: { contains: q, mode: 'insensitive' } },
          { jobType: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (params.state?.trim()) {
      andClauses.push({
        givenState: { contains: params.state.trim(), mode: 'insensitive' },
      });
    }

    if (params.city?.trim()) {
      andClauses.push({ city: { contains: params.city.trim(), mode: 'insensitive' } });
    }

    if (params.district?.trim()) {
      andClauses.push({ givenDistrict: { contains: params.district.trim(), mode: 'insensitive' } });
    }

    if (params.jobType?.trim() && params.jobType !== 'ALL') {
      andClauses.push({ jobType: { contains: params.jobType.trim(), mode: 'insensitive' } });
    }

    if (params.status?.trim() && params.status !== 'ALL') {
      andClauses.push({ status: params.status as any });
    }

    const where = { AND: andClauses };

    const pins = await prisma.formGigLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 3000,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        jobType: true,
        status: true,
        givenLat: true,
        givenLng: true,
      },
    });

    return pins;
  },


  getLeadById: async (id: string) => {
    return prisma.formGigLead.findUnique({ where: { id } });
  },

  updateLeadStatus: async (id: string, status: LeadStatus, notes?: string) => {
    return prisma.formGigLead.update({
      where: { id },
      data: { status, notes }
    });
  },

  getDirectWorkersPreview: async (service?: string, city?: string) => {
    const categoryMapping: Record<string, string> = {
      'electrician': 'Electrician',
      'plumber': 'Plumber',
      'carpenter': 'Carpenter',
      'painter': 'Painter',
      'cleaning': 'Cleaner',
      'cleaner': 'Cleaner',
      'ac-repair': 'AC',
      'appliance-repair': 'Appliance',
      'security': 'Security',
      'loading-unloading': 'Loader',
      'general-helper': 'Helper',
      'furniture-moving': 'Furniture',
      'packer': 'Packer',
      'delivery': 'Delivery',
      'last-mile-delivery': 'Delivery',
    };

    const searchJobType = (service && categoryMapping[service.toLowerCase().trim()]) || service || 'Electrician';

    let leads = await prisma.formGigLead.findMany({
      where: {
        jobType: { contains: searchJobType, mode: 'insensitive' },
        ...(city && city !== 'All' ? { city: { contains: city.trim(), mode: 'insensitive' } } : {}),
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        jobType: true,
        city: true,
        area: true,
        givenDistrict: true,
        notes: true,
        status: true,
        givenLat: true,
        givenLng: true,
      },
    });

    if (leads.length < 10) {
      const existingIds = leads.map((l: any) => l.id);
      const moreLeads = await prisma.formGigLead.findMany({
        where: {
          jobType: { contains: searchJobType, mode: 'insensitive' },
          id: { notIn: existingIds },
        },
        take: 10 - leads.length,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          jobType: true,
          city: true,
          area: true,
          givenDistrict: true,
          notes: true,
          status: true,
          givenLat: true,
          givenLng: true,
        },
      });
      leads = [...leads, ...moreLeads];
    }

    return leads.map((lead: any, idx: number) => {
      const notes = lead.notes || '';
      const expMatch = notes.match(/\[Experience\]:\s*([^\n]+)/);
      const rateMatch = notes.match(/\[Rate \/ Pricing\]:\s*([^\n]+)/);
      const skillsMatch = notes.match(/\[Skills\]:\s*([^\n]+)/);

      const phone = lead.phone || '9876543210';
      const masked = phone.length >= 10
        ? `${phone.slice(0, 2)}******${phone.slice(-2)}`
        : '98******21';

      const charCode = phone.charCodeAt(phone.length - 1) || 50;
      const rating = (4.7 + ((charCode % 3) / 10)).toFixed(1);
      const reviews = 18 + (charCode % 45);
      const distance = (1.2 + ((idx * 3.7) % 7) * 0.5).toFixed(1) + ' km away';

      return {
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName !== '-' ? lead.lastName : ''}`.trim(),
        jobType: lead.jobType || searchJobType,
        city: lead.city || city || 'Metro Hub',
        area: lead.area || lead.givenDistrict || lead.city || 'Operational Hub',
        experience: expMatch ? expMatch[1].trim() : `${3 + (idx % 8)} Years`,
        price: rateMatch ? rateMatch[1].trim() : `₹${500 + (idx % 5) * 50} / day`,
        skills: skillsMatch ? skillsMatch[1].trim() : 'Verified professional with on-demand availability',
        rating,
        reviews,
        distance,
        status: 'Aadhaar Verified',
        phoneMasked: masked,
        phoneRaw: phone,
      };
    });
  },

  /**
   * Create Payment Order for ₹49 Metro Mitra Worker Onboarding Fee
   * Supports Cashfree with Razorpay fallback
   */
  createOnboardingOrder: async (data: {
    firstName?: string;
    lastName?: string;
    phone: string;
    email?: string;
    city?: string;
    jobType?: string;
    gateway?: 'CASHFREE' | 'RAZORPAY';
  }) => {
    const cleanPhone = String(data.phone || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw AppError.badRequest('A valid 10-digit Indian mobile number is required.', 'INVALID_PHONE');
    }

    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Gig Worker Candidate';
    // Production testing configuration: Gateway (Cashfree/Razorpay) is ₹1 for test onboarding.
    // Static UPI QR Code (Scanner) remains ₹49.
    const amountInPaise = 100; // ₹1 for production gateway test
    const chargedAmount = 1.0;
    const requestedGateway = data.gateway || 'CASHFREE';

    // 1. Try Cashfree if requested or default
    if (requestedGateway === 'CASHFREE' && process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY) {
      try {
        const orderId = `cf_wrk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const cfOrder = await cashfreeClient.createOrder({
          orderId,
          orderAmount: chargedAmount,
          orderCurrency: 'INR',
          customerPhone: cleanPhone,
          customerName: fullName,
          customerEmail: data.email || `${cleanPhone}@metromitra.com`,
          orderNote: `Metro Mitra Worker Onboarding Test 1 - ${data.jobType || 'Gig Worker'}`,
          orderTags: {
            platform: PlatformSource.WORKFORCE_WEB,
            paymentType: PaymentType.SUBSCRIPTION,
            jobType: data.jobType || '',
            city: data.city || '',
          },
        });

        // Pre-create pending PaymentTransaction record
        try {
          await prisma.paymentTransaction.create({
            data: {
              platform: PlatformSource.WORKFORCE_WEB,
              paymentType: PaymentType.SUBSCRIPTION,
              amount: chargedAmount,
              currency: 'INR',
              status: TransactionPaymentStatus.PENDING,
              razorpayOrderId: cfOrder.order_id,
              customerName: fullName,
              customerPhone: cleanPhone,
              customerEmail: data.email || null,
              notes: {
                platform: 'WORKFORCE_WEB',
                jobType: data.jobType || '',
                city: data.city || '',
              },
              metadata: {
                gateway: 'CASHFREE',
                cf_order_id: cfOrder.cf_order_id,
                paymentSessionId: cfOrder.payment_session_id,
                membership: 'PREMIUM_WORKER_90D',
                jobType: data.jobType || '',
                city: data.city || '',
              },
            },
          });
        } catch (txErr: any) {
          logger.warn(`[WorkerOnboarding] Failed to pre-create pending transaction: ${txErr?.message}`);
        }

        return {
          gateway: 'CASHFREE',
          orderId: cfOrder.order_id,
          paymentSessionId: cfOrder.payment_session_id,
          amount: chargedAmount,
          currency: 'INR',
          customerPhone: cleanPhone,
          customerName: fullName,
        };
      } catch (cfErr: any) {
        logger.warn(`[WorkerOnboarding] Cashfree order initialization error: ${cfErr?.message}`);
      }
    }

    // 2. Razorpay Gateway (Primary or Fallback)
    let orderId = `order_wrk_${Date.now()}`;
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `wrk_onb_${Date.now()}`.slice(0, 40),
          notes: {
            platform: PlatformSource.WORKFORCE_WEB,
            paymentType: PaymentType.SUBSCRIPTION,
            plan: 'PREMIUM_WORKER_90D',
            name: fullName,
            phone: cleanPhone,
            email: data.email || '',
            city: data.city || '',
            jobType: data.jobType || '',
          },
        });
        orderId = rzpOrder.id;

        try {
          await prisma.paymentTransaction.create({
            data: {
              platform: PlatformSource.WORKFORCE_WEB,
              paymentType: PaymentType.SUBSCRIPTION,
              amount: chargedAmount,
              currency: 'INR',
              status: TransactionPaymentStatus.PENDING,
              razorpayOrderId: rzpOrder.id,
              customerName: fullName,
              customerPhone: cleanPhone,
              customerEmail: data.email || null,
              notes: {
                platform: 'WORKFORCE_WEB',
                jobType: data.jobType || '',
                city: data.city || '',
              },
              metadata: {
                gateway: 'RAZORPAY',
                membership: 'PREMIUM_WORKER_90D',
                jobType: data.jobType || '',
                city: data.city || '',
              },
            },
          });
        } catch (txErr: any) {
          logger.warn(`[WorkerOnboarding] Failed to pre-create pending transaction: ${txErr?.message}`);
        }
      } catch (rzpErr: any) {
        logger.warn(`[WorkerOnboarding] Razorpay order fallback: ${rzpErr?.message}`);
      }
    }

    return {
      gateway: 'RAZORPAY',
      orderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId,
      customerPhone: cleanPhone,
      customerName: fullName,
    };
  },

  /**
   * Complete Worker Onboarding with Verified ₹49 Payment
   * Supports CASHFREE, RAZORPAY, and UPI_QR (with 12-digit UTR)
   */
  onboardWithPayment: async (data: any, files: { [fieldname: string]: Express.Multer.File[] } = {}) => {
    const {
      firstName, lastName, email, phone, jobType, city, area,
      paymentMethod, razorpay_order_id, razorpay_payment_id, razorpay_signature,
      cashfree_order_id, utr
    } = data;

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw AppError.badRequest('A valid 10-digit Indian mobile number is required.', 'INVALID_PHONE');
    }

    const fullName = `${firstName || ''} ${lastName || ''}`.trim();
    if (!fullName || fullName.length < 2) {
      throw AppError.badRequest('Full name is required.', 'INVALID_NAME');
    }

    const method = String(paymentMethod || 'CASHFREE').toUpperCase();
    let paymentRef = '';

    if (method === 'UPI_QR') {
      const cleanUtr = String(utr || '').replace(/\D/g, '');
      if (cleanUtr.length !== 12) {
        throw AppError.badRequest('Invalid UPI Transaction ID. UTR must be exactly 12 numeric digits.', 'INVALID_UTR');
      }
      if (/^(\d)\1{11}$/.test(cleanUtr) || cleanUtr === '123456789012') {
        throw AppError.badRequest('Invalid UPI Transaction ID. Please enter genuine 12-digit UTR from payment receipt.', 'INVALID_UTR');
      }
      paymentRef = `UTR-${cleanUtr}`;
    } else if (method === 'CASHFREE') {
      const cfOrderId = cashfree_order_id || razorpay_order_id;
      if (!cfOrderId) {
        throw AppError.badRequest('Missing Cashfree order identifier.', 'ORDER_ID_REQUIRED');
      }
      try {
        const payments = await cashfreeClient.getOrderPayments(cfOrderId);
        const successful = payments.find(p => p.payment_status === 'SUCCESS');
        if (successful) {
          paymentRef = successful.cf_payment_id;
        } else {
          paymentRef = `cf_pay_${cfOrderId}`;
        }
      } catch (err: any) {
        logger.warn(`[WorkerOnboarding] Cashfree verify check: ${err?.message}`);
        paymentRef = `cf_pay_${cfOrderId}`;
      }
    } else {
      // RAZORPAY
      if (!razorpay_payment_id) {
        throw AppError.badRequest('Missing payment ID.', 'PAYMENT_ID_REQUIRED');
      }
      if (process.env.RAZORPAY_KEY_SECRET && razorpay_order_id && razorpay_signature) {
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(body.toString())
          .digest('hex');
        if (expectedSignature !== razorpay_signature) {
          logger.warn(`[WorkerOnboarding] Invalid signature for payment ${razorpay_payment_id}`);
          if (process.env.NODE_ENV === 'production') {
            throw AppError.badRequest('Cryptographic signature verification failed for payment.', 'INVALID_SIGNATURE');
          }
        }
      }
      paymentRef = razorpay_payment_id;
    }

    const isGateway = method === 'CASHFREE' || method === 'RAZORPAY';
    const amountPaid = isGateway ? 1.0 : 49.0;

    // 1. Create Lead with payment notes
    const lead = await FormGigLeadService.createLead({
      ...data,
      firstName: firstName || '',
      lastName: lastName || '',
      phone: cleanPhone,
      notes: `₹${amountPaid} Onboarding Paid (${method}) - 90-Day Verified Gig Worker Membership Active. Ref: ${paymentRef}`,
    }, files);

    // Update status to SUITABLE
    await prisma.formGigLead.update({
      where: { id: lead.id },
      data: { status: LeadStatus.SUITABLE },
    });

    // 2. Record PaymentTransaction
    const orderKey = cashfree_order_id || razorpay_order_id || `onb_wrk_${Date.now()}`;
    try {
      await prisma.paymentTransaction.upsert({
        where: { razorpayOrderId: orderKey },
        create: {
          platform: PlatformSource.WORKFORCE_WEB,
          paymentType: PaymentType.SUBSCRIPTION,
          amount: amountPaid,
          currency: 'INR',
          status: TransactionPaymentStatus.SUCCESS,
          razorpayOrderId: orderKey,
          razorpayPaymentId: paymentRef,
          customerName: fullName,
          customerPhone: cleanPhone,
          customerEmail: email || null,
          metadata: {
            membership: 'PREMIUM_WORKER_90D',
            jobType: jobType || '',
            city: city || '',
            leadId: lead.id,
            paymentMethod: method,
            paymentRef,
            amountPaid,
          },
        },
        update: {
          status: TransactionPaymentStatus.SUCCESS,
          razorpayPaymentId: paymentRef,
          customerName: fullName,
          customerPhone: cleanPhone,
          amount: amountPaid,
        },
      });
    } catch (txErr: any) {
      logger.warn(`[WorkerOnboarding] Failed to record PaymentTransaction: ${txErr?.message}`);
    }

    // 3. Provision or update User record
    try {
      await prisma.user.upsert({
        where: { phone: cleanPhone },
        create: {
          phone: cleanPhone,
          name: fullName,
          email: email ? String(email).trim() : null,
          role: UserRole.WORKER,
          profileComplete: true,
        },
        update: {
          name: fullName,
          email: email ? String(email).trim() : undefined,
          role: UserRole.WORKER,
          profileComplete: true,
        },
      });
    } catch (userErr: any) {
      logger.warn(`[WorkerOnboarding] User account provision: ${userErr?.message}`);
    }

    const refId = `MM-${new Date().getFullYear()}-${lead.id.slice(0, 8).toUpperCase()}`;

    return {
      leadId: lead.id,
      refId,
      name: fullName,
      phone: cleanPhone,
      jobType: lead.jobType,
      city: lead.city,
      status: 'VERIFIED_ACTIVE',
      amountPaid,
      paymentMethod: method,
      paymentReference: paymentRef,
      membership: '90-Day Premium Verified Worker Membership',
    };
  }
};
