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

export const logGMTWhatsAppMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      intent,
      name,
      phone,
      email,
      pickupCity,
      dropCity,
      vehicleType,
      goodsType,
      city,
      partnerCity,
      enterpriseCity,
      vehicleNumber,
      companyName,
      monthlyRequirement,
      bookingNumber,
      query,
      sourceUrl,
      notes,
      ...rest
    } = req.body;

    // Generate unique human-readable WhatsApp inquiry number (e.g. WA-102938)
    const inquiryNumber = (bookingNumber && typeof bookingNumber === 'string' && bookingNumber.startsWith('WA-'))
      ? bookingNumber
      : `WA-${Math.floor(100000 + Math.random() * 900000)}`;

    const resolvedCity = city || partnerCity || enterpriseCity || pickupCity || null;

    // 1. Save WhatsApp inquiry into PostgreSQL via Prisma
    const inquiry = await prisma.whatsAppInquiry.create({
      data: {
        inquiryNumber,
        intent: String(intent || 'WhatsApp Inquiry'),
        name: String(name || 'Anonymous'),
        phone: String(phone || ''),
        email: email ? String(email) : null,
        pickupCity: pickupCity ? String(pickupCity) : null,
        dropCity: dropCity ? String(dropCity) : null,
        vehicleType: vehicleType ? String(vehicleType) : null,
        goodsType: goodsType ? String(goodsType) : null,
        city: resolvedCity ? String(resolvedCity) : null,
        vehicleNumber: vehicleNumber ? String(vehicleNumber) : null,
        companyName: companyName ? String(companyName) : null,
        monthlyRequirement: monthlyRequirement ? String(monthlyRequirement) : null,
        bookingNumber: bookingNumber ? String(bookingNumber) : inquiryNumber,
        query: query ? String(query) : null,
        sourceUrl: sourceUrl ? String(sourceUrl) : null,
        notes: notes ? String(notes) : null,
        status: 'AVAILABLE',
      },
    });

    // 2. Dual-save to Lead table for instant Admin visibility across legacy panels
    try {
      await prisma.lead.create({
        data: {
          name: String(name || 'Anonymous'),
          phone: String(phone || ''),
          email: email ? String(email) : null,
          city: String(pickupCity || resolvedCity || 'All Cities'),
          role: 'WHATSAPP_INQUIRY',
          companyName: companyName ? String(companyName) : null,
          vehicleType: vehicleType ? String(vehicleType) : null,
          vehicleNumber: vehicleNumber ? String(vehicleNumber) : null,
          notes: `[${inquiryNumber}] Intent: ${intent || 'N/A'}${pickupCity ? ` | Route: ${pickupCity} -> ${dropCity || ''}` : ''}${goodsType ? ` | Goods: ${goodsType}` : ''}${query ? ` | Query: ${query}` : ''}`,
          status: 'PENDING',
        },
      });
    } catch (dualErr) {
      console.error('[leads.controller] Lead dual-save non-fatal warning:', dualErr);
    }

    // 3. Fire-and-forget to GoMyTruck WhatsApp_Enquiries sheet
    appendToGMTSheet('WhatsApp_Enquiries', {
      inquiryNumber,
      intent: intent || '',
      name: name || '',
      phone: phone || '',
      email: email || '',
      pickupCity: pickupCity || '',
      dropCity: dropCity || '',
      vehicleType: vehicleType || '',
      goodsType: goodsType || '',
      city: resolvedCity || '',
      vehicleNumber: vehicleNumber || '',
      companyName: companyName || '',
      monthlyRequirement: monthlyRequirement || '',
      bookingNumber: inquiryNumber,
      query: query || '',
      sourceUrl: sourceUrl || '',
      notes: notes || '',
      ...rest,
    }).catch((sheetErr) => {
      console.error('[leads.controller] GMT Sheets append error:', sheetErr);
    });

    // Return structured response
    res.status(200).json({
      success: true,
      message: 'Inquiry saved successfully to Database & Sheets',
      data: {
        id: inquiry.id,
        inquiryNumber: inquiry.inquiryNumber,
        status: inquiry.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Driver-end API: Fetches available WhatsApp booking inquiries formatted for LoadItem in Driver App
 */
export const getDriverWhatsAppLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status = 'AVAILABLE', city, vehicleType, limit = '50', page = '1' } = req.query;
    const take = Math.min(Number(limit) || 50, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }

    if (city && typeof city === 'string' && city.trim() !== '' && city.toLowerCase() !== 'all') {
      where.OR = [
        { pickupCity: { contains: city.trim(), mode: 'insensitive' } },
        { dropCity: { contains: city.trim(), mode: 'insensitive' } },
        { city: { contains: city.trim(), mode: 'insensitive' } },
      ];
    }

    if (vehicleType && typeof vehicleType === 'string' && vehicleType.trim() !== '' && vehicleType.toLowerCase() !== 'all') {
      where.vehicleType = { contains: vehicleType.trim(), mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.whatsAppInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.whatsAppInquiry.count({ where }),
    ]);

    // Format fields for direct 100% compatibility with Driver App LoadItem.fromMap
    const formatted = items.map((item) => {
      const pickup = item.pickupCity ? `${item.pickupCity} Hub` : (item.city || 'Hub Location');
      const drop = item.dropCity ? `${item.dropCity} Hub` : 'Delivery Point';

      return {
        id: item.id,
        bookingNumber: item.inquiryNumber, // Starts with WA- -> Driver LoadItem automatically flags as LoadSource.whatsApp
        source: 'WHATSAPP',
        bookingMode: 'WHATSAPP_LEAD',
        pickupAddress: pickup,
        pickup: pickup,
        pickupCity: item.pickupCity || item.city || 'All Cities',
        pickupArea: item.pickupCity || item.city || 'Local Area',
        pickupDistrict: item.pickupCity || item.city || 'Local Area',
        pickupState: 'N/A',
        state: 'N/A',
        dropAddress: drop,
        dropoffAddress: drop,
        drop: drop,
        dropCity: item.dropCity || 'All Cities',
        dropoffCity: item.dropCity || 'All Cities',
        dropArea: item.dropCity || 'Local Area',
        dropoffDistrict: item.dropCity || 'Local Area',
        dropState: 'N/A',
        dropoffState: 'N/A',
        estimatedDistance: 18.5,
        distanceKm: 18.5,
        estimatedDistanceKm: 18.5,
        vehicleType: item.vehicleType || 'Tata Ace',
        truckType: item.vehicleType || 'Tata Ace',
        goodsType: item.goodsType || 'General Cargo',
        goodsWeightKg: 1000,
        weightKg: 1000,
        totalFare: 2500,
        price: 2500,
        customerBudget: 2500,
        quotedAmount: 2500,
        grandTotal: 2500,
        status: item.status,
        brokerStatus: item.status,
        customerName: item.name,
        customerPhone: item.phone,
        receiverPhone: item.phone,
        notes: item.query || item.notes || `WhatsApp Direct Lead: ${item.intent}`,
        handlingInstructions: item.goodsType ? `Cargo: ${item.goodsType}` : undefined,
        specialInstructions: item.query || item.notes || undefined,
        pickupTime: 'Immediate Pickup',
        isUrgent: true,
        hasLoadingService: false,
        laborRequired: false,
        createdAt: item.createdAt.toISOString(),
        intent: item.intent,
        inquiryNumber: item.inquiryNumber,
        assignedDriverId: item.assignedDriverId,
        companyName: item.companyName,
        monthlyRequirement: item.monthlyRequirement,
        vehicleNumber: item.vehicleNumber,
        sourceUrl: item.sourceUrl,
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      total,
      page: Number(page) || 1,
      limit: take,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Driver-end API: Get single WhatsApp lead details
 */
export const getWhatsAppInquiryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const inquiry = await prisma.whatsAppInquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      return next(AppError.notFound('WhatsApp lead not found'));
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Driver-end API: Accept / claim a WhatsApp lead
 */
export const acceptDriverWhatsAppLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const driverId = req.user?.id;

    if (!driverId) {
      return next(AppError.unauthorized('Driver authentication required'));
    }

    const existing = await prisma.whatsAppInquiry.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(AppError.notFound('WhatsApp lead not found'));
    }

    if (existing.status !== 'AVAILABLE') {
      return next(AppError.badRequest(`This lead is already ${existing.status.toLowerCase()}`));
    }

    const updated = await prisma.whatsAppInquiry.update({
      where: { id },
      data: {
        status: 'ASSIGNED',
        assignedDriverId: driverId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Lead successfully accepted by driver',
      data: {
        id: updated.id,
        inquiryNumber: updated.inquiryNumber,
        status: updated.status,
        assignedDriverId: updated.assignedDriverId,
        customerName: updated.name,
        customerPhone: updated.phone,
        pickupCity: updated.pickupCity,
        dropCity: updated.dropCity,
        goodsType: updated.goodsType,
        vehicleType: updated.vehicleType,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin API: List WhatsApp inquiries with filtering and pagination
 */
export const getAdminWhatsAppInquiries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit = '50', page = '1' } = req.query;
    const take = Math.min(Number(limit) || 50, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }

    const [items, total] = await Promise.all([
      prisma.whatsAppInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.whatsAppInquiry.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page) || 1,
      limit: take,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};
