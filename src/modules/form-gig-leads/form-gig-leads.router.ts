import { Router } from 'express';
import { authenticate, requireRole } from '@shared/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { FormGigLeadController } from './form-gig-leads.controller';
import { upload } from '../upload/upload.controller';

export const FormGigLeadRouter = Router();

// POST /api/v1/form-gig-leads - Public route for the driver form
FormGigLeadRouter.post(
  '/',
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'aadharFront', maxCount: 1 },
    { name: 'aadharBack', maxCount: 1 },
    { name: 'dlFront', maxCount: 1 },
    { name: 'dlBack', maxCount: 1 },
    { name: 'rcBook', maxCount: 1 },
    { name: 'insurance', maxCount: 1 }
  ]),
  FormGigLeadController.createLead
);

// Admin routes
FormGigLeadRouter.use(authenticate, requireRole(UserRole.ADMIN));

// GET /api/v1/form-gig-leads
FormGigLeadRouter.get('/', FormGigLeadController.getAllLeads);

// GET /api/v1/form-gig-leads/:id
FormGigLeadRouter.get('/:id', FormGigLeadController.getLeadById);

// PATCH /api/v1/form-gig-leads/:id
FormGigLeadRouter.patch('/:id', FormGigLeadController.updateLeadStatus);

