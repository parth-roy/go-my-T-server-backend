import { PrismaClient, VehicleType } from '@prisma/client';
import { s3Service, UploadFolder } from '../upload/upload.service';
import { logger } from '@shared/logger';
import { google } from 'googleapis';

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
}

export const formDriverLeadService = new FormDriverLeadService();
