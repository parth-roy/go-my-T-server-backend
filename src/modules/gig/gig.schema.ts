import { z } from 'zod';

const GIG_SKILLS = [
  'HELPER', 'LOADER', 'FURNITURE_MOVER', 'HEAVY_LOADER',
  'PACKER', 'CLEANER', 'ELECTRICIAN', 'RIGGER', 'PLUMBER', 'AC_REPAIR', 'APPLIANCE_REPAIR', 'SECURITY_GUARD', 'CARPENTER', 'PAINTER',
] as const;

const GIG_URGENCIES = ['IMMEDIATE', 'WITHIN_HOUR', 'SCHEDULED'] as const;

export const createGigSchema = z.object({
  gigType:        z.string().min(2).max(50).optional(), // legacy, kept for backwards compat
  gigCategory:    z.enum(GIG_SKILLS).default('HELPER'),
  description:    z.string().max(500).optional(),
  contactPhone:   z.string().max(20).optional(),
  locationLat:    z.number().min(-90).max(90).optional().default(22.5726),
  locationLng:    z.number().min(-180).max(180).optional().default(88.3639),
  locationAddress:z.string().min(3).max(500),
  workersNeeded:  z.number().int().min(1).max(20).default(1),
  durationHours:  z.number().int().min(1).max(12).default(2),
  urgency:        z.enum(GIG_URGENCIES).default('SCHEDULED'),
  scheduledHour:  z.number().int().min(0).max(23).optional(), // for night surge detection
  isTaskBased:    z.boolean().optional().default(false),
  scheduledSlot:  z.string().optional(),
  tipAmount:      z.number().min(0).optional().default(0),
  paymentMethod:  z.enum(['CASH', 'ONLINE', 'UPI', 'WALLET', 'CARD', 'NETBANKING']).optional(),
  paymentStatus:  z.enum(['PENDING', 'PAID', 'FAILED']).optional(),
  tasks: z.array(z.object({
    title: z.string(),
    category: z.string(),
    quantity: z.number().int().min(1).default(1),
    price: z.number().min(0).default(0),
    variant: z.string().optional()
  })).optional()
});

export const verifyGigPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId:   z.string().min(1),
  razorpaySignature: z.string().min(1),
  isMock:            z.boolean().optional(),
});

export const estimateGigSchema = z.object({
  gigCategory:    z.enum(GIG_SKILLS).default('HELPER'),
  locationLat:    z.number().min(-90).max(90).optional().default(22.5726),
  locationLng:    z.number().min(-180).max(180).optional().default(88.3639),
  workersNeeded:  z.number().int().min(1).max(20).default(1),
  durationHours:  z.number().int().min(1).max(12).default(2),
  urgency:        z.enum(GIG_URGENCIES).default('SCHEDULED'),
  scheduledHour:  z.number().int().min(0).max(23).optional(),
});

export const updateGigStatusSchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export const cancelGigSchema = z.object({
  reason: z.string().max(200).optional(),
});
