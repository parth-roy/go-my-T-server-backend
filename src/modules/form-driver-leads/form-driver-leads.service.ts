import { PrismaClient, VehicleType } from '@prisma/client';
import { s3Service, UploadFolder } from '../upload/upload.service';
import { logger } from '@shared/logger';
import { google } from 'googleapis';

const prisma = new PrismaClient();

export class FormDriverLeadService {
  async createLead(data: any, files: { [fieldname: string]: Express.Multer.File[] }) {
    // Extract textual data
    const {
      name, phone, altPhone, city, vehicleType, vehicleNumber, aadharNumber, dlNumber
    } = data;

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
        phone,
        alternatePhone: altPhone || null,
        city,
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

    const row = [
      lead.id,
      new Date(lead.createdAt).toLocaleString(),
      lead.name,
      lead.phone,
      lead.alternatePhone || '',
      lead.city,
      lead.vehicleType,
      lead.vehicleNumber,
      lead.aadharNumber,
      lead.dlNumber,
      lead.status,
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
      range: 'Sheet1!A:R', 
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });
    
    logger.info(`Lead ${lead.id} synced to Google Sheets`);
  }
}

export const formDriverLeadService = new FormDriverLeadService();
