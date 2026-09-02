import { PrismaClient, LeadStatus } from '@prisma/client';
import { s3Service, UploadFolder } from '../upload/upload.service';

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

  /**
   * Lightweight viewport-bounded map pins for gig leads.
   * Returns only id, lat, lng, jobType, status, firstName, city.
   */
  getMapPins: async (params: {
    swLat?: number;
    swLng?: number;
    neLat?: number;
    neLng?: number;
    jobType?: string;
    status?: string;
  }) => {
    const where: any = {
      givenLat: { not: null },
      givenLng: { not: null },
    };

    if (
      params.swLat != null && params.swLng != null &&
      params.neLat != null && params.neLng != null
    ) {
      where.givenLat = { gte: params.swLat, lte: params.neLat };
      where.givenLng = { gte: params.swLng, lte: params.neLng };
    }
    if (params.jobType?.trim() && params.jobType !== 'ALL') {
      where.jobType = { contains: params.jobType.trim(), mode: 'insensitive' };
    }
    if (params.status?.trim() && params.status !== 'ALL') {
      where.status = params.status as any;
    }

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
  }
};
