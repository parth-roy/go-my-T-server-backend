import { Request, Response, NextFunction } from 'express';
import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';
import { appendToSheet, appendToGMTSheet } from '@shared/services/googleSheets.service';
import { s3Service, UploadFolder } from '../upload/upload.service';

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      name, companyName, email, phone, altPhone, city, state, transportHub, 
      role, vehicleType, vehicleNumber, aadharNumber, dlNumber 
    } = req.body;

    // Handle File Uploads via DO Spaces (S3)
    const files = req.files as Express.Multer.File[] || [];
    const documentUrls: Record<string, string> = {};

    for (const file of files) {
      const uploadResult = await s3Service.uploadFile(
        file.buffer, 
        file.originalname, 
        file.mimetype, 
        UploadFolder.DOCUMENTS
      );
      if (uploadResult.success && uploadResult.url) {
        documentUrls[file.fieldname] = uploadResult.url;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name: name || '',
        companyName,
        email,
        phone: phone || '',
        altPhone,
        city: city || '',
        state,
        transportHub,
        role: role || '',
        vehicleType,
        vehicleNumber,
        aadharNumber,
        dlNumber,
        profilePhoto: documentUrls['profilePhoto'],
        aadharFront: documentUrls['aadharFront'],
        aadharBack: documentUrls['aadharBack'],
        dlFront: documentUrls['dlFront'],
        dlBack: documentUrls['dlBack'],
        rcBook: documentUrls['rcBook'],
        insurance: documentUrls['insurance'],
      }
    });

    // Map exact columns to match CSV:
    // 1: Lead ID, 2: Reg Date, 3: Name, 4: Email, 5: Phone, 6: Alt Phone, 7: City, 8: State, 9: Hub, 
    // 10: Vehicle Type, 11: Vehicle Num, 12: DL, 13: Aadhaar, 14: Status, 15: Last Contact, 16: Notes, 
    // 17: Doc 1, 18: Doc 2, 19: Doc 3, 20: Doc 4, 21: Doc 5, 22: Doc 6, 23: Doc 7
    appendToSheet('Get_Job_Applicants', {
      id: lead.id,
      date: new Date().toISOString().split('T')[0],
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone,
      altPhone: lead.altPhone || '',
      city: lead.city,
      state: lead.state || '',
      transportHub: lead.transportHub || '',
      vehicleType: lead.vehicleType || '',
      vehicleNumber: lead.vehicleNumber || '',
      dlNumber: lead.dlNumber || '',
      aadharNumber: lead.aadharNumber || '',
      status: 'PENDING',
      lastContact: '',
      notes: '',
      profilePhoto: lead.profilePhoto || '',
      aadharFront: lead.aadharFront || '',
      aadharBack: lead.aadharBack || '',
      dlFront: lead.dlFront || '',
      dlBack: lead.dlBack || '',
      rcBook: lead.rcBook || '',
      insurance: lead.insurance || ''
    }).catch((err: any) => console.error('Sheet append error:', err));

    // ── GoMyTruck sheet routing by role ──────────────────────────────────────
    const roleStr = (lead.role || '').toLowerCase();
    if (roleStr.includes('estimate')) {
      appendToGMTSheet('Estimate_Requests', {
        id:          lead.id,
        name:        lead.name,
        phone:       lead.phone,
        city:        lead.city,                      // pickup city
        dropCity:    req.body.dropCity    || '',
        serviceType: req.body.serviceType || '',
        vehicleType: req.body.vehicleType || lead.vehicleType || '',
        weight:      req.body.weight      || '',
        notes:       req.body.notes       || '',
      }).catch(() => {});
    } else if (roleStr.includes('enterprise')) {
      appendToGMTSheet('Enterprise_Enquiries', {
        id:          lead.id,
        name:        lead.name,
        phone:       lead.phone,
        email:       lead.email || '',
        companyName: lead.companyName || '',
        city:        lead.city,
        notes:       req.body.notes || '',
      }).catch(() => {});
    } else {
      // Fleet Owner / Driver Partner / any other GoMyTruck lead
      appendToGMTSheet('Fleet_Partner_Leads', {
        id:          lead.id,
        name:        lead.name,
        phone:       lead.phone,
        city:        lead.city,
        role:        lead.role || '',
        vehicleType: lead.vehicleType || '',
        state:       lead.state || '',
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Lead application submitted successfully',
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

export const getLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as any;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    
    const where: any = status ? { status } : {};
    
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where })
    ]);

    res.json({
      success: true,
      data: leads,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkforceLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as any;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    
    const where: any = {
      role: { in: ['WORKFORCE', 'EMPLOYER'] },
      ...(status ? { status } : {})
    };
    
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where })
    ]);

    res.json({
      success: true,
      data: leads,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeadStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const lead = await prisma.lead.update({
      where: { id: id as string },
      data: { 
        status,
        ...(notes !== undefined && { notes })
      }
    });

    if (status === 'SUITABLE') {
      const roleStr = lead.role.toLowerCase();
      const isDriver = roleStr.includes('driver') || roleStr.includes('fleet') || roleStr.includes('truck');
      const assignedRole = isDriver ? 'DRIVER' : 'WORKER';

      // Create User if not exists
      let user = await prisma.user.findUnique({ where: { phone: lead.phone } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            phone: lead.phone,
            name: lead.name,
            role: assignedRole,
          }
        });
      }

      if (isDriver) {
        // Create Driver Profile
        const existingDriver = await prisma.driver.findUnique({ where: { userId: user.id } });
        if (!existingDriver) {
          await prisma.driver.create({
            data: {
              userId: user.id,
              licenseNumber: `PENDING_${user.id}`,
            }
          });
        }
      } else {
        // Create Worker Profile
        const existingWorker = await prisma.worker.findUnique({ where: { userId: user.id } });
        if (!existingWorker) {
          await prisma.worker.create({
            data: {
              userId: user.id,
              isActive: true,
              isDocVerified: false
            }
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Lead status updated successfully',
      data: lead
    });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return next(AppError.notFound('Lead not found'));
    }
    next(error);
  }
};

// ── Log WhatsApp Modal submission to Google Sheets ───────────────────────────
// Called from the frontend browser when user clicks "Open WhatsApp Chat".
// Runs server-side to avoid CORS issues with direct browser→Apps Script calls.
export const logWhatsAppMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, phone, city, intent,
      service, location, timing, count,
      message, sourceUrl
    } = req.body;

    // Respond immediately — don't make browser wait for the sheet append
    res.status(200).json({ success: true, message: 'Logged' });

    // Fire-and-forget after response sent
    appendToSheet('WhatsApp_Messages', {
      name:      name      || '',
      phone:     phone     || '',
      city:      city      || '',
      intent:    intent    || '',
      service:   service   || '',
      location:  location  || '',
      timing:    timing    || '',
      count:     count     || '',
      message:   message   || '',
      sourceUrl: sourceUrl || '',
    }).catch(() => {});

  } catch (error) {
    next(error);
  }
};
