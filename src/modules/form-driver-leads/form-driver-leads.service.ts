import { PrismaClient, VehicleType } from '@prisma/client';
import { s3Service, UploadFolder } from '../upload/upload.service';
import { logger } from '@shared/logger';
import { google } from 'googleapis';

const prisma = new PrismaClient();

export class FormDriverLeadService {
  async createLead(data: any, files: { [fieldname: string]: Express.Multer.File[] }) {
    // Extract textual data
    const {
      name, email, phone, altPhone, city, state, transportHub, vehicleType, vehicleNumber, aadharNumber, dlNumber
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
