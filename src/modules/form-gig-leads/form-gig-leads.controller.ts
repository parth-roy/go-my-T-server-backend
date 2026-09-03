import { Request, Response, NextFunction } from 'express';
import { FormGigLeadService } from './form-gig-leads.service';
import { logger } from '@shared/logger';

export const FormGigLeadController = {
  createLead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Body has text fields, files are in req.files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const lead = await FormGigLeadService.createLead(req.body, files || {});
      
      return res.status(201).json({
        success: true,
        data: lead,
        message: 'Gig Lead created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  getAllLeads: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leads = await FormGigLeadService.getAllLeads();
      return res.status(200).json({ success: true, data: leads });
    } catch (error) {
      next(error);
    }
  },

  listLeads: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await FormGigLeadService.listLeads({
        page: req.query.page as any,
        limit: req.query.limit as any,
        search: req.query.search as string,
        state: req.query.state as string,
        city: req.query.city as string,
        district: req.query.district as string,
        jobType: req.query.jobType as string,
        status: req.query.status as string,
      });
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  getFilterOptions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = await FormGigLeadService.getFilterOptions();
      return res.status(200).json({ success: true, data: options });
    } catch (error) {
      next(error);
    }
  },

  getMapPins: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pins = await FormGigLeadService.getMapPins({
        swLat: req.query.swLat ? parseFloat(req.query.swLat as string) : undefined,
        swLng: req.query.swLng ? parseFloat(req.query.swLng as string) : undefined,
        neLat: req.query.neLat ? parseFloat(req.query.neLat as string) : undefined,
        neLng: req.query.neLng ? parseFloat(req.query.neLng as string) : undefined,
        search: req.query.search as string,
        state: req.query.state as string,
        city: req.query.city as string,
        district: req.query.district as string,
        jobType: req.query.jobType as string,
        status: req.query.status as string,
      });
      return res.status(200).json({ success: true, data: pins, total: pins.length });
    } catch (error) {
      next(error);
    }
  },

  getLeadById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lead = await FormGigLeadService.getLeadById(req.params.id as string);
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
      const lead = await FormGigLeadService.updateLeadStatus(req.params.id as string, status, notes);
      return res.status(200).json({
        success: true,
        data: lead,
        message: 'Lead updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  getDirectWorkersPreview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const service = req.query.service as string;
      const city = req.query.city as string;
      const workers = await FormGigLeadService.getDirectWorkersPreview(service, city);
      return res.status(200).json({
        success: true,
        count: workers.length,
        data: workers,
      });
    } catch (error) {
      next(error);
    }
  }
};

