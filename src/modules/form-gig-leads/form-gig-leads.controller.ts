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
  }
};

