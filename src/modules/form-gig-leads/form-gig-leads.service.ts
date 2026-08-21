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
          const url = await s3Service.uploadFile(file, UploadFolder.PARTNER_DOCUMENTS);
          uploadedUrls[key + 'Url'] = url;
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

  getLeadById: async (id: string) => {
    return prisma.formGigLead.findUnique({ where: { id } });
  }
};
