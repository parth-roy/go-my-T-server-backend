import { z } from 'zod';

export const InitiateLeadUnlockSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  serviceCategory: z.string().optional().default('PLUMBER'),
  searchAddress: z.string().optional(),
  amount: z.number().optional().default(49),
});

export type InitiateLeadUnlockInput = z.infer<typeof InitiateLeadUnlockSchema>;

export const VerifyLeadUnlockSchema = z.object({
  transactionId: z.string().min(1, 'transactionId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
});

export type VerifyLeadUnlockInput = z.infer<typeof VerifyLeadUnlockSchema>;

export const PreviewNearbyExpertsSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  serviceCategory: z.string().optional().default('PLUMBER'),
  radiusKm: z.coerce.number().optional().default(50),
});

export type PreviewNearbyExpertsInput = z.infer<typeof PreviewNearbyExpertsSchema>;
