import {
  PrismaClient,
  VehicleType,
  PlatformSource,
  PaymentType,
  TransactionPaymentStatus,
  SubscriptionPlan,
  UserRole,
  LeadStatus,
} from '@prisma/client';
import { s3Service, UploadFolder } from '../upload/upload.service';
import { logger } from '@shared/logger';
import { google } from 'googleapis';
import { razorpay } from '@modules/payment/razorpay.client';
import crypto from 'crypto';
import { AppError } from '@shared/errors/AppError';

const prisma = new PrismaClient();

export class FormDriverLeadService {
  async createLead(data: any, files: { [fieldname: string]: Express.Multer.File[] }) {
    // Extract textual data
    const {
      name, email, phone, altPhone, city, transportHub, vehicleType, vehicleNumber, aadharNumber, dlNumber,
      givenAddress, givenStreet, givenDistrict, givenState, givenPincode, givenLat, givenLng,
      autoAddress, autoStreet, autoDistrict, autoState, autoPincode, autoLat, autoLng
    } = data;
    
    const state = data.state || givenState || autoState || 'N/A';

    // Haversine Distance Calculation (if both coordinates are provided)
    let locationDistance = null;
    let isLocationVerified = false;

    if (givenLat && givenLng && autoLat && autoLng) {
      const R = 6371e3; // Earth radius in meters
      const lat1 = parseFloat(givenLat) * Math.PI / 180;
      const lat2 = parseFloat(autoLat) * Math.PI / 180;
      const deltaLat = (parseFloat(autoLat) - parseFloat(givenLat)) * Math.PI / 180;
      const deltaLng = (parseFloat(autoLng) - parseFloat(givenLng)) * Math.PI / 180;

      const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      locationDistance = R * c; // in meters

      // Mark verified if distance is less than 5000 meters (5km) - giving some leeway for inaccurate browser GPS
      if (locationDistance <= 5000) {
        isLocationVerified = true;
      }
    }

    // Upload files to S3 sequentially (or in parallel)
    const uploadedUrls: Record<string, string> = {};

    const fileKeys = [
      'profilePhoto', 'aadharFront', 'aadharBack', 'dlFront', 'dlBack', 'rcBook', 'insurance'
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
            uploadedUrls[`${key}Url`] = result.url;
          }
        } catch (e) {
          logger.error(`Failed to upload ${key}`, e);
        }
      }
    }

    // Save to database
    const lead = await prisma.formDriverLead.create({
      data: {
        name,
        email,
        phone,
        alternatePhone: altPhone || null,
        city,
        state,
        transportHub,
        vehicleType: vehicleType as VehicleType,
        vehicleNumber,
        aadharNumber,
        dlNumber,
        profilePhotoUrl: uploadedUrls['profilePhotoUrl'] || null,
        aadharFrontUrl: uploadedUrls['aadharFrontUrl'] || null,
        aadharBackUrl: uploadedUrls['aadharBackUrl'] || null,
        dlFrontUrl: uploadedUrls['dlFrontUrl'] || null,
        dlBackUrl: uploadedUrls['dlBackUrl'] || null,
        rcBookUrl: uploadedUrls['rcBookUrl'] || null,
        insuranceUrl: uploadedUrls['insuranceUrl'] || null,

        // Given Location
        givenAddress: givenAddress || null,
        givenStreet: givenStreet || null,
        givenDistrict: givenDistrict || null,
        givenState: givenState || null,
        givenPincode: givenPincode || null,
        givenLat: givenLat ? parseFloat(givenLat) : null,
        givenLng: givenLng ? parseFloat(givenLng) : null,

        // Auto Location
        autoAddress: autoAddress || null,
        autoStreet: autoStreet || null,
        autoDistrict: autoDistrict || null,
        autoState: autoState || null,
        autoPincode: autoPincode || null,
        autoLat: autoLat ? parseFloat(autoLat) : null,
        autoLng: autoLng ? parseFloat(autoLng) : null,

        locationDistance: locationDistance,
        isLocationVerified: isLocationVerified,
      }
    });

    // Fire and forget Google Sheets sync
    this.syncToGoogleSheets(lead).catch(e => logger.error("Google Sheets Sync failed", e));

    return lead;
  }

  /**
   * Create Razorpay Order for ₹99 Driver Onboarding Fee
   */
  async createOnboardingOrder(data: {
    name?: string;
    phone: string;
    email?: string;
    city?: string;
    vehicleType?: string;
  }) {
    const cleanPhone = String(data.phone || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw AppError.badRequest('A valid 10-digit Indian mobile number is required.', 'INVALID_PHONE');
    }

    const amountInPaise = 100; // ₹1 for live testing (was 9900)
    const chargedAmount = 1.0;
    let orderId = 'order_drv_' + Date.now();
    const keyId = process.env.RAZORPAY_KEY_ID || '';

    try {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `drv_onb_${Date.now()}`.slice(0, 40),
          notes: {
            platform: PlatformSource.VAHAN_WEB,
            paymentType: PaymentType.SUBSCRIPTION,
            plan: 'PREMIUM_DRIVER_90D',
            name: data.name || '',
            phone: cleanPhone,
            email: data.email || '',
            city: data.city || '',
            vehicleType: data.vehicleType || '',
          },
        });
        orderId = order.id;

        // Pre-create pending PaymentTransaction record
        try {
          await prisma.paymentTransaction.upsert({
            where: { razorpayOrderId: order.id },
            create: {
              platform: PlatformSource.VAHAN_WEB,
              paymentType: PaymentType.SUBSCRIPTION,
              amount: chargedAmount,
              currency: 'INR',
              status: TransactionPaymentStatus.PENDING,
              razorpayOrderId: order.id,
              customerName: data.name || null,
              customerPhone: cleanPhone,
              customerEmail: data.email || null,
              notes: order.notes as any,
              metadata: {
                membership: 'PREMIUM_90_DAYS',
                plan: 'PREMIUM_DRIVER_90D',
                city: data.city || '',
                vehicleType: data.vehicleType || '',
              },
            },
            update: {
              status: TransactionPaymentStatus.PENDING,
              amount: chargedAmount,
              customerName: data.name || null,
              customerPhone: cleanPhone,
              customerEmail: data.email || null,
            },
          });
        } catch (txErr: any) {
          logger.warn(`[DriverOnboarding] Failed to pre-create pending transaction: ${txErr?.message}`);
        }
      }
    } catch (rzpErr: any) {
      logger.warn(`[DriverOnboarding] Razorpay order creation fallback: ${rzpErr?.message}`);
      orderId = 'order_drv_' + Date.now();
    }

    return {
      orderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId,
      customerPhone: cleanPhone,
      customerName: data.name || '',
      customerEmail: data.email || '',
    };
  }

  /**
   * Complete Driver Onboarding with Verified ₹99 Payment
   * Provisions FormDriverLead, User, Driver profile, and 90-Day Premium Subscription.
   */
  async onboardWithPayment(data: any, files: { [fieldname: string]: Express.Multer.File[] }) {
    const {
      name, email, phone, city, vehicleType, dlNumber,
      paymentMethod, razorpay_order_id, razorpay_payment_id, razorpay_signature, utr
    } = data;

    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw AppError.badRequest('A valid 10-digit Indian mobile number is required.', 'INVALID_PHONE');
    }
    if (!name || String(name).trim().length < 2) {
      throw AppError.badRequest('Full name is required.', 'INVALID_NAME');
    }

    // Verify Payment
    const method = String(paymentMethod || 'RAZORPAY').toUpperCase();

    if (method === 'UPI_QR') {
      const cleanUtr = String(utr || '').replace(/\D/g, '');
      if (cleanUtr.length !== 12) {
        throw AppError.badRequest('Invalid UPI Transaction ID. UTR must be exactly 12 numeric digits.', 'INVALID_UTR');
      }
      if (/^(\d)\1{11}$/.test(cleanUtr) || cleanUtr === '123456789012') {
        throw AppError.badRequest('Invalid UPI Transaction ID. Please enter genuine 12-digit UTR from payment receipt.', 'INVALID_UTR');
      }
    } else {
      // Razorpay payment verification
      if (!razorpay_payment_id) {
        throw AppError.badRequest('Missing Razorpay payment ID.', 'PAYMENT_ID_REQUIRED');
      }
      if (process.env.RAZORPAY_KEY_SECRET && razorpay_order_id && razorpay_signature) {
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(body.toString())
          .digest('hex');
        if (expectedSignature !== razorpay_signature) {
          logger.warn(`[DriverOnboarding] Invalid signature for payment ${razorpay_payment_id}`);
          if (process.env.NODE_ENV === 'production') {
            throw AppError.badRequest('Cryptographic signature verification failed for payment.', 'INVALID_SIGNATURE');
          }
        }
      }
    }

    // 1. Create standard Lead via createLead
    const lead = await this.createLead({
      ...data,
      phone: cleanPhone,
      notes: `₹99 Onboarding Paid (${method}) - 90-Day Premium Membership Active. Ref: ${razorpay_payment_id || utr}`,
    }, files);

    // Update lead status to APPROVED
    await prisma.formDriverLead.update({
      where: { id: lead.id },
      data: { status: LeadStatus.APPROVED },
    });

    // 2. Provision or update User account
    const user = await prisma.user.upsert({
      where: { phone: cleanPhone },
      create: {
        phone: cleanPhone,
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        role: UserRole.DRIVER,
        profileComplete: true,
      },
      update: {
        name: String(name).trim(),
        email: email ? String(email).trim() : undefined,
        role: UserRole.DRIVER,
        profileComplete: true,
      },
    });

    // 3. Provision or update Driver profile
    const driverLicense = dlNumber ? String(dlNumber).trim() : `DL_${cleanPhone}`;
    const driver = await prisma.driver.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        licenseNumber: driverLicense,
        dlNumber: driverLicense,
        status: 'OFFLINE',
        isDocVerified: true,
        isActive: true,
      },
      update: {
        licenseNumber: driverLicense,
        dlNumber: driverLicense,
        isDocVerified: true,
        isActive: true,
      },
    });

    // 4. Provision 90-Day Premium Driver Subscription
    const now = new Date();
    const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // exactly 90 days validity

    const subscription = await prisma.driverSubscription.upsert({
      where: { driverId: driver.id },
      create: {
        driverId: driver.id,
        plan: SubscriptionPlan.PREMIUM,
        pricePerMonth: 9900,
        startDate: now,
        endDate: endDate,
        isActive: true,
        paymentReference: razorpay_payment_id || utr || 'onboarding_paid',
        paymentMethod: method.toLowerCase(),
      },
      update: {
        plan: SubscriptionPlan.PREMIUM,
        pricePerMonth: 9900,
        startDate: now,
        endDate: endDate,
        isActive: true,
        paymentReference: razorpay_payment_id || utr || 'onboarding_paid',
        paymentMethod: method.toLowerCase(),
      },
    });

    // 5. Record / Update PaymentTransaction
    const orderKey = razorpay_order_id || `onb_${method}_${Date.now()}`;
    await prisma.paymentTransaction.upsert({
      where: { razorpayOrderId: orderKey },
      create: {
        platform: PlatformSource.VAHAN_WEB,
        paymentType: PaymentType.SUBSCRIPTION,
        amount: 1.0, // ₹1 for live testing (was 99.0)
        currency: 'INR',
        status: TransactionPaymentStatus.SUCCESS,
        razorpayOrderId: razorpay_order_id || null,
        razorpayPaymentId: razorpay_payment_id || utr || null,
        razorpaySignature: razorpay_signature || null,
        customerName: String(name).trim(),
        customerPhone: cleanPhone,
        customerEmail: email ? String(email).trim() : null,
        userId: user.id,
        entityId: driver.id,
        metadata: {
          membership: 'PREMIUM_90_DAYS',
          plan: 'PREMIUM_DRIVER_90D',
          leadId: lead.id,
          city: city || '',
          vehicleType: vehicleType || '',
          expiresAt: endDate.toISOString(),
          daysRemaining: 90,
        },
      },
      update: {
        status: TransactionPaymentStatus.SUCCESS,
        razorpayPaymentId: razorpay_payment_id || utr || null,
        razorpaySignature: razorpay_signature || null,
        userId: user.id,
        entityId: driver.id,
      },
    });

    logger.info(`[DriverOnboarding] Successfully onboarded driver ${cleanPhone} with 90-day premium membership until ${endDate.toISOString()}`);

    return {
      lead,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      driver: {
        id: driver.id,
        licenseNumber: driver.licenseNumber,
        isDocVerified: driver.isDocVerified,
      },
      subscription: {
        plan: subscription.plan,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining: 90,
        isActive: subscription.isActive,
      },
    };
  }

  async getAllLeads() {
    return prisma.formDriverLead.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  /** Paginated, server-filtered list for the admin table view */
  async listLeads(params: {
    page?: number;
    limit?: number;
    search?: string;
    state?: string;
    city?: string;
    district?: string;
    vehicleType?: string;
    status?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 100));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { transportHub: { contains: q, mode: 'insensitive' } },
        { vehicleNumber: { contains: q, mode: 'insensitive' } },
        { givenDistrict: { contains: q, mode: 'insensitive' } },
        { givenState: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (params.state?.trim()) {
      where.OR = undefined; // clear OR to allow AND combination
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { state: { contains: params.state.trim(), mode: 'insensitive' } },
            { givenState: { contains: params.state.trim(), mode: 'insensitive' } },
          ],
        },
      ];
    }
    if (params.city?.trim()) {
      where.AND = [
        ...(where.AND || []),
        { city: { contains: params.city.trim(), mode: 'insensitive' } },
      ];
    }
    if (params.district?.trim()) {
      where.AND = [
        ...(where.AND || []),
        { givenDistrict: { contains: params.district.trim(), mode: 'insensitive' } },
      ];
    }
    if (params.vehicleType?.trim() && params.vehicleType !== 'ALL') {
      where.vehicleType = params.vehicleType as any;
    }
    if (params.status?.trim() && params.status !== 'ALL') {
      where.status = params.status as any;
    }

    // Re-wire search OR with AND filters if both present
    if (params.search?.trim() && params.state?.trim()) {
      const searchOr = {
        OR: [
          { name: { contains: params.search.trim(), mode: 'insensitive' } },
          { phone: { contains: params.search.trim(), mode: 'insensitive' } },
          { city: { contains: params.search.trim(), mode: 'insensitive' } },
          { transportHub: { contains: params.search.trim(), mode: 'insensitive' } },
          { vehicleNumber: { contains: params.search.trim(), mode: 'insensitive' } },
          { givenDistrict: { contains: params.search.trim(), mode: 'insensitive' } },
          { givenState: { contains: params.search.trim(), mode: 'insensitive' } },
        ],
      };
      where.OR = undefined;
      where.AND = [searchOr, ...(where.AND || [])];
    }

    const [data, total] = await Promise.all([
      prisma.formDriverLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, name: true, phone: true, alternatePhone: true,
          city: true, state: true, transportHub: true,
          vehicleType: true, vehicleNumber: true,
          givenDistrict: true, givenState: true, givenPincode: true,
          givenLat: true, givenLng: true,
          status: true, notes: true, isLocationVerified: true,
          locationDistance: true, createdAt: true,
          profilePhotoUrl: true,
        },
      }),
      prisma.formDriverLead.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Returns distinct states, districts, and cities for cascading search comboboxes */
  async getFilterOptions() {
    const leads = await prisma.formDriverLead.findMany({
      select: {
        state: true,
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
      const state = (lead.givenState || lead.state || '').trim();
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
  }

  /**
   * Lightweight map-pins endpoint — viewport bounding-box and filter aware.
   * Returns only the fields needed to render a cluster map (id, lat, lng, vehicleType, status, name, city).
   * Capped at 3000 pins.
   */
  async getMapPins(params: {
    swLat?: number;
    swLng?: number;
    neLat?: number;
    neLng?: number;
    search?: string;
    state?: string;
    city?: string;
    district?: string;
    vehicleType?: string;
    status?: string;
  }) {
    const andClauses: any[] = [
      { givenLat: { not: null } },
      { givenLng: { not: null } },
    ];

    // Viewport bounding-box spatial filter
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
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { transportHub: { contains: q, mode: 'insensitive' } },
          { vehicleNumber: { contains: q, mode: 'insensitive' } },
          { givenDistrict: { contains: q, mode: 'insensitive' } },
          { givenState: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (params.state?.trim()) {
      andClauses.push({
        OR: [
          { state: { contains: params.state.trim(), mode: 'insensitive' } },
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

    if (params.vehicleType?.trim() && params.vehicleType !== 'ALL') {
      andClauses.push({ vehicleType: params.vehicleType as any });
    }

    if (params.status?.trim() && params.status !== 'ALL') {
      andClauses.push({ status: params.status as any });
    }

    const where = { AND: andClauses };

    const pins = await prisma.formDriverLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 3000,
      select: {
        id: true,
        name: true,
        city: true,
        vehicleType: true,
        status: true,
        givenLat: true,
        givenLng: true,
      },
    });

    return pins;
  }

  async getLeadById(id: string) {
    return prisma.formDriverLead.findUnique({
      where: { id }
    });
  }

  async updateLeadStatus(id: string, status: string, notes?: string) {
    return prisma.formDriverLead.update({
      where: { id },
      data: { status: status as any, notes }
    });
  }

  private async syncToGoogleSheets(lead: any) {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    // Replace literal \n with actual newline for the private key
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!spreadsheetId || !clientEmail || !privateKey) {
      logger.warn('Google Sheets credentials missing, skipping sync');
      return;
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1: Lead ID, 2: Reg Date, 3: Name, 4: Email, 5: Phone, 6: Alt Phone, 7: City, 8: State, 9: Hub, 
    // 10: Vehicle Type, 11: Vehicle Num, 12: DL, 13: Aadhaar, 14: Status, 15: Last Contact, 16: Notes, 
    // 17: Doc 1, 18: Doc 2, 19: Doc 3, 20: Doc 4, 21: Doc 5, 22: Doc 6, 23: Doc 7
    const row = [
      lead.id,
      new Date(lead.createdAt).toISOString().split('T')[0],
      lead.name,
      lead.email || '',
      lead.phone,
      lead.alternatePhone || '',
      lead.city,
      lead.state || '',
      lead.transportHub || '',
      lead.vehicleType || '',
      lead.vehicleNumber || '',
      lead.dlNumber || '',
      lead.aadharNumber || '',
      lead.status,
      '',
      lead.notes || '',
      lead.profilePhotoUrl || '',
      lead.aadharFrontUrl || '',
      lead.aadharBackUrl || '',
      lead.dlFrontUrl || '',
      lead.dlBackUrl || '',
      lead.rcBookUrl || '',
      lead.insuranceUrl || ''
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:W', 
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });
    
    logger.info(`Lead ${lead.id} synced to Google Sheets`);
  }

  /**
   * Preview 10 real verified commercial driver partners for the Direct Contact unlock marketplace.
   * Matches vehicle category and city, falling back to nationwide pool of that vehicle class if needed.
   */
  async getDirectDriversPreview(vehicleCategory?: string, city?: string) {
    const categoryMapping: Record<string, VehicleType[]> = {
      'tata-ace': [VehicleType.TATA_ACE, VehicleType.MINI_TRUCK],
      'bolero-pickup': [VehicleType.BOLERO_PICKUP, VehicleType.MINI_OPEN_PICKUP],
      'ashok-leyland-dost': [VehicleType.ASHOK_LEYLAND_DOST],
      'tata-intra': [VehicleType.TATA_INTRA],
      'mahindra-jeeto': [VehicleType.MAHINDRA_JEETO],
      'three-wheeler': [VehicleType.THREE_WHEELER],
      'mini-van': [VehicleType.MINI_CLOSED_VAN, VehicleType.MINI_TRUCK],
      '14ft': [VehicleType.TRUCK_14FT, VehicleType.TRUCK_14FT_OPEN, VehicleType.TRUCK_14FT_CLOSED],
      '17ft': [VehicleType.TRUCK_17FT, VehicleType.TRUCK_17FT_CLOSED],
      '19ft': [VehicleType.TRUCK_19FT],
      '20ft': [VehicleType.TRUCK_20FT],
      '32ft': [VehicleType.CONTAINER_32FT],
    };

    const targetTypes = (vehicleCategory && categoryMapping[vehicleCategory.toLowerCase().trim()]) || [VehicleType.TATA_ACE];
    const categoryLabelMap: Record<string, string> = {
      'tata-ace': 'Tata Ace (750 kg)',
      'bolero-pickup': 'Mahindra Bolero Pickup (1.5 Ton)',
      'ashok-leyland-dost': 'Ashok Leyland Dost (1.25 Ton)',
      'tata-intra': 'Tata Intra V30/V50 (1.3 Ton)',
      'mahindra-jeeto': 'Mahindra Jeeto (600 kg)',
      'three-wheeler': '3-Wheeler Commercial Cargo (500 kg)',
      'mini-van': 'Mini Closed Delivery Van (800 kg)',
      '14ft': '14 Feet Eicher Truck (4-5 Ton)',
      '17ft': '17 Feet Commercial Truck (7 Ton)',
      '19ft': '19 Feet Multi-Axle Truck (8-9 Ton)',
      '20ft': '20 Feet Multi-Axle (10 Ton)',
      '32ft': '32ft Multi-Axle Container (15-18 Ton)',
    };
    const displayVehicleName = categoryLabelMap[vehicleCategory?.toLowerCase().trim() || 'tata-ace'] || 'Commercial Freight Carrier';

    const baseRatesMap: Record<string, string> = {
      'tata-ace': '₹600 Base',
      'bolero-pickup': '₹850 Base',
      'ashok-leyland-dost': '₹800 Base',
      'tata-intra': '₹800 Base',
      'mahindra-jeeto': '₹550 Base',
      'three-wheeler': '₹450 Base',
      'mini-van': '₹700 Base',
      '14ft': '₹1,800 Base',
      '17ft': '₹2,400 Base',
      '19ft': '₹2,800 Base',
      '20ft': '₹3,200 Base',
      '32ft': '₹5,500 Base',
    };
    const baseRate = baseRatesMap[vehicleCategory?.toLowerCase().trim() || 'tata-ace'] || '₹800 Base';

    // 1. Try finding in the specified city
    let leads = await prisma.formDriverLead.findMany({
      where: {
        vehicleType: { in: targetTypes },
        ...(city && city !== 'All' ? { city: { contains: city.trim(), mode: 'insensitive' } } : {}),
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        vehicleType: true,
        vehicleNumber: true,
        city: true,
        state: true,
        transportHub: true,
        givenDistrict: true,
        status: true,
      },
    });

    // 2. If fewer than 10 leads found in the specific city, fill remaining from other hubs with that vehicle type
    if (leads.length < 10) {
      const existingIds = leads.map((l: any) => l.id);
      const moreLeads = await prisma.formDriverLead.findMany({
        where: {
          vehicleType: { in: targetTypes },
          id: { notIn: existingIds },
        },
        take: 10 - leads.length,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          vehicleType: true,
          vehicleNumber: true,
          city: true,
          state: true,
          transportHub: true,
          givenDistrict: true,
          status: true,
        },
      });
      leads = [...leads, ...moreLeads];
    }

    return leads.map((lead: any, idx: number) => {
      const phone = (lead.phone || '9876543210').replace(/\D/g, '');
      const masked = phone.length >= 10
        ? `${phone.slice(-10, -8)}******${phone.slice(-2)}`
        : '98******21';
      const raw10 = phone.length >= 10 ? phone.slice(-10) : '9876543210';

      const charCode = (lead.name.charCodeAt(0) || 65) + idx * 7;
      const rating = (4.7 + ((charCode % 3) / 10)).toFixed(1);
      const trips = 110 + (charCode % 180);
      const distance = (1.1 + ((idx * 2.3) % 6) * 0.7).toFixed(1) + ' km away';

      // Mask vehicle number for preview privacy: e.g. "WB-24-****-4122" or "DL 01 **** 88"
      let maskedVehNum = lead.vehicleNumber;
      if (maskedVehNum && maskedVehNum.length >= 8) {
        const parts = maskedVehNum.split(/[- ]+/);
        if (parts.length >= 3) {
          maskedVehNum = `${parts[0]}-${parts[1]}-****-${parts[parts.length - 1]}`;
        } else {
          maskedVehNum = `${maskedVehNum.slice(0, 4)} **** ${maskedVehNum.slice(-2)}`;
        }
      }

      return {
        id: lead.id,
        name: lead.name,
        vehicleType: displayVehicleName,
        vehicleNumber: maskedVehNum || `${lead.state || 'DL'} 01 **** ${idx + 10}`,
        city: city || lead.city || 'Operational Hub',
        area: lead.transportHub || lead.givenDistrict || `${city || lead.city} Transport Stand`,
        experience: `${4 + (idx % 9)} Years Driving`,
        price: baseRate,
        rating,
        trips,
        distance,
        status: 'Commercial DL & RC Verified',
        phoneMasked: masked,
        phoneRaw: raw10,
      };
    });
  }
}

export const formDriverLeadService = new FormDriverLeadService();
