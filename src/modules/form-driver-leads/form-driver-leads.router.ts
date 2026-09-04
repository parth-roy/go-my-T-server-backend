import { Router } from 'express';
import { authenticate, requireRole } from '@shared/middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { formDriverLeadController } from './form-driver-leads.controller';
import { upload } from '../upload/upload.controller';

export const formDriverLeadRouter = Router();

// POST /api/v1/form-driver-leads - Public route for the driver form
formDriverLeadRouter.post(
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
  formDriverLeadController.createLead
);

// GET /api/v1/form-driver-leads/direct-preview?vehicleType=&city= - Public preview for Direct Contact
formDriverLeadRouter.get('/direct-preview', formDriverLeadController.getDirectDriversPreview);

// Admin routes
formDriverLeadRouter.use(authenticate, requireRole(UserRole.ADMIN));

// GET /api/v1/form-driver-leads?page=1&limit=100&search=&state=&city=&vehicleType=&status=
formDriverLeadRouter.get('/', formDriverLeadController.listLeads);

// GET /api/v1/form-driver-leads/map-pins?swLat=&swLng=&neLat=&neLng=&vehicleType=&status=
// IMPORTANT: must be registered BEFORE /:id to avoid route collision
formDriverLeadRouter.get('/map-pins', formDriverLeadController.getMapPins);

// GET /api/v1/form-driver-leads/filter-options
formDriverLeadRouter.get('/filter-options', formDriverLeadController.getFilterOptions);

// GET /api/v1/form-driver-leads/:id
formDriverLeadRouter.get('/:id', formDriverLeadController.getLeadById);

// PATCH /api/v1/form-driver-leads/:id
formDriverLeadRouter.patch('/:id', formDriverLeadController.updateLeadStatus);
