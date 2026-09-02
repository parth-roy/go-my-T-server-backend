import { Router } from 'express';
import { authenticate, requireRole } from '@shared/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { FormGigLeadController } from './form-gig-leads.controller';
import { upload } from '../upload/upload.controller';

export const formGigLeadRouter = Router();

// POST /api/v1/form-gig-leads - Public route for the driver form
formGigLeadRouter.post(
  '/',
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'aadharFront', maxCount: 1 },
    { name: 'aadharBack', maxCount: 1 },
    { name: 'panFront', maxCount: 1 },
    { name: 'dlFront', maxCount: 1 },
    { name: 'dlBack', maxCount: 1 },
    { name: 'rcBook', maxCount: 1 },
    { name: 'insurance', maxCount: 1 }
  ]),
  FormGigLeadController.createLead
);

// Admin routes
formGigLeadRouter.use(authenticate, requireRole(UserRole.ADMIN));

// GET /api/v1/form-gig-leads?page=1&limit=100&search=&state=&city=&jobType=&status=
formGigLeadRouter.get('/', FormGigLeadController.listLeads);

// GET /api/v1/form-gig-leads/map-pins?swLat=&swLng=&neLat=&neLng=&jobType=&status=
// IMPORTANT: must be registered BEFORE /:id to avoid route collision
formGigLeadRouter.get('/map-pins', FormGigLeadController.getMapPins);

// GET /api/v1/form-gig-leads/filter-options
formGigLeadRouter.get('/filter-options', FormGigLeadController.getFilterOptions);

// GET /api/v1/form-gig-leads/:id
formGigLeadRouter.get('/:id', FormGigLeadController.getLeadById);

// PATCH /api/v1/form-gig-leads/:id
formGigLeadRouter.patch('/:id', FormGigLeadController.updateLeadStatus);
