import { z } from 'zod';
import { OrganizationType } from '../../domain/enums/organization.enum';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  organizationType: z.nativeEnum(OrganizationType).optional(),
  legalName: z.string().min(2).optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format').optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional(),
});

export const inviteMemberSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Invalid email').optional(),
  role: z.enum(['ORG_ADMIN', 'HR', 'SUPERVISOR', 'EMPLOYEE', 'VIEWER']),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  organizationType: z.nativeEnum(OrganizationType).optional(),
  legalName: z.string().min(2).optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN').optional(),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN').optional(),
});
