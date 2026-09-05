import { Request, Response, NextFunction } from 'express';
import { formDriverLeadService } from './form-driver-leads.service';
import { logger } from '@shared/logger';

export const formDriverLeadController = {
  createLead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Body has text fields, files are in req.files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const lead = await formDriverLeadService.createLead(req.body, files || {});
      
      return res.status(201).json({
        success: true,
        data: lead,
        message: 'Driver lead created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  createOnboardingOrder: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await formDriverLeadService.createOnboardingOrder(req.body);
      return res.status(200).json({
        success: true,
        data: order,
        message: 'Driver onboarding payment order created',
      });
    } catch (error) {
      next(error);
    }
  },

  onboardWithPayment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const result = await formDriverLeadService.onboardWithPayment(req.body, files || {});
      return res.status(201).json({
        success: true,
        data: result,
        message: 'Driver successfully onboarded with 90-day premium membership',
      });
    } catch (error) {
      next(error);
    }
  },

  getAllLeads: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leads = await formDriverLeadService.getAllLeads();
      return res.status(200).json({ success: true, data: leads });
    } catch (error) {
      next(error);
    }
  },

  listLeads: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await formDriverLeadService.listLeads({
        page: req.query.page as any,
        limit: req.query.limit as any,
        search: req.query.search as string,
        state: req.query.state as string,
        city: req.query.city as string,
        district: req.query.district as string,
        vehicleType: req.query.vehicleType as string,
        status: req.query.status as string,
      });
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  getFilterOptions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = await formDriverLeadService.getFilterOptions();
      return res.status(200).json({ success: true, data: options });
    } catch (error) {
      next(error);
    }
  },

  getMapPins: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pins = await formDriverLeadService.getMapPins({
        swLat: req.query.swLat ? parseFloat(req.query.swLat as string) : undefined,
        swLng: req.query.swLng ? parseFloat(req.query.swLng as string) : undefined,
        neLat: req.query.neLat ? parseFloat(req.query.neLat as string) : undefined,
        neLng: req.query.neLng ? parseFloat(req.query.neLng as string) : undefined,
        search: req.query.search as string,
        state: req.query.state as string,
        city: req.query.city as string,
        district: req.query.district as string,
        vehicleType: req.query.vehicleType as string,
        status: req.query.status as string,
      });
      return res.status(200).json({ success: true, data: pins, total: pins.length });
    } catch (error) {
      next(error);
    }
  },

  getLeadById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lead = await formDriverLeadService.getLeadById(req.params.id as string);
      if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }
      return res.status(200).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  },

  updateLeadStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, notes } = req.body;
      const lead = await formDriverLeadService.updateLeadStatus(req.params.id as string, status, notes);
      return res.status(200).json({
        success: true,
        data: lead,
        message: 'Lead updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  getDirectDriversPreview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vehicleType = req.query.vehicleType as string;
      const city = req.query.city as string;
      const drivers = await formDriverLeadService.getDirectDriversPreview(vehicleType, city);
      return res.status(200).json({
        success: true,
        count: drivers.length,
        data: drivers,
      });
    } catch (error) {
      next(error);
    }
  }
};
