import { z } from 'zod';
import { VehicleType, BookingStatus } from '@prisma/client';

export const postBrokerLoadSchema = z.object({
  vehicleType: z.nativeEnum(VehicleType),
  pickupCity: z.string().min(2).max(100),
  pickupAddress: z.string().min(5).max(500),
  dropCity: z.string().min(2).max(100),
  dropAddress: z.string().min(5).max(500),
  goodsType: z.string().default('General Goods'),
  goodsWeightKg: z.number().positive(),
  estimatedDistanceKm: z.number().positive().optional(),
  customerBudget: z.number().positive().min(100).max(10_000_000),
  targetCities: z.array(z.string()).default([]),
});

export const submitBrokerQuoteSchema = z.object({
  driverPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  driverName: z.string().optional(),
  vehicleRegNo: z.string().min(5).max(15),
  vehicleRcPhotoUrl: z.string().url(),
  vehiclePhotoUrl: z.string().url().optional(),
  negotiatedAmount: z.number().positive(),
  flatFeeBounty: z.number().positive().default(100),
});

export const reviewBrokerQuoteSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT', 'COUNTER']),
  rejectedReason: z.string().optional(),
  counterAmount: z.number().optional(),
}).superRefine((data, ctx) => {
  if (data.action === 'REJECT' && !data.rejectedReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'rejectedReason is required when action is REJECT',
      path: ['rejectedReason']
    });
  }
  if (data.action === 'COUNTER' && data.counterAmount === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'counterAmount is required when action is COUNTER',
      path: ['counterAmount']
    });
  }
});

export const confirmAdvanceSchema = z.object({
  advanceAmount: z.number().positive(),
  advancePaymentRef: z.string().min(5),
});

export const verifyLoadingOtpSchema = z.object({
  loadingOtp: z.string().length(4).regex(/^\d{4}$/, 'OTP must be 4 digits'),
});

export const settleBountySchema = z.object({
  settlementRef: z.string().min(5),
  notes: z.string().optional(),
});

export const brokerLoadsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).default(10),
  status: z.string().optional(),
  city: z.string().optional(),
});

export const updateAgentKycSchema = z.object({
  isKycVerified: z.boolean(),
  notes: z.string().optional(),
});

export const adminAgentsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).default(20),
  search: z.string().optional(),
  isKycVerified: z.string().optional(),
  city: z.string().optional(),
});

export const updateBrokerConfigSchema = z.object({
  customerAdvancePercent: z.number().min(0).max(100).optional(),
  platformRetentionPercent: z.number().min(0).max(100).optional(),
  driverAdvancePercent: z.number().min(0).max(100).optional(),
  defaultFlatFeeBounty: z.number().min(0).optional(),
  driverRetentionBonus: z.number().min(0).optional(),
});

export type PostBrokerLoadInput = z.infer<typeof postBrokerLoadSchema>;
export type SubmitBrokerQuoteInput = z.infer<typeof submitBrokerQuoteSchema>;
export type ReviewBrokerQuoteInput = z.infer<typeof reviewBrokerQuoteSchema>;
export type ConfirmAdvanceInput = z.infer<typeof confirmAdvanceSchema>;
export type VerifyLoadingOtpInput = z.infer<typeof verifyLoadingOtpSchema>;
export type SettleBountyInput = z.infer<typeof settleBountySchema>;
export type BrokerLoadsQuery = z.infer<typeof brokerLoadsQuerySchema>;
export type UpdateAgentKycInput = z.infer<typeof updateAgentKycSchema>;
export type AdminAgentsQuery = z.infer<typeof adminAgentsQuerySchema>;
export type UpdateBrokerConfigInput = z.infer<typeof updateBrokerConfigSchema>;

