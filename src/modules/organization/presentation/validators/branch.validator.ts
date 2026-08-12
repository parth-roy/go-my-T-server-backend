import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().min(2, 'Name is too short').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  address: z.string().min(5, 'Address is too short'),
  city: z.string().min(2, 'City is too short'),
  state: z.string().min(2, 'State is too short'),
  country: z.string().optional(),
  postalCode: z.string().min(4, 'Postal code is too short'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  managerId: z.string().uuid('Invalid manager ID').optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2, 'Name is too short').max(100, 'Name is too long').optional(),
  description: z.string().max(500, 'Description is too long').nullable().optional(),
  address: z.string().min(5, 'Address is too short').optional(),
  city: z.string().min(2, 'City is too short').optional(),
  state: z.string().min(2, 'State is too short').optional(),
  country: z.string().optional(),
  postalCode: z.string().min(4, 'Postal code is too short').optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
  managerId: z.string().uuid('Invalid manager ID').nullable().optional(),
});
