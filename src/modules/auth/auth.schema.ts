import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .refine((val) => /^[6-9]\d{9}$/.test(val) || z.string().email().safeParse(val).success, {
      message: 'Enter a valid 10-digit mobile number or email address',
    }),
  fcmToken: z.string().optional(), // FCM device token — OTP is delivered via push notification
  role: z.enum(['CUSTOMER', 'DRIVER', 'ADMIN', 'FLEET_OWNER']).optional().default('CUSTOMER'),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .refine((val) => /^[6-9]\d{9}$/.test(val) || z.string().email().safeParse(val).success, {
      message: 'Enter a valid 10-digit mobile number or email address',
    }),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d+$/, 'OTP must be numeric'),
  fcmToken: z.string().optional(), // Firebase Cloud Messaging token
  role: z.enum(['CUSTOMER', 'DRIVER', 'ADMIN', 'FLEET_OWNER']).optional().default('CUSTOMER'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const socialLoginSchema = z.object({
  idToken: z.string().min(10, 'Firebase ID token is required'),
  provider: z.enum(['GOOGLE', 'FACEBOOK', 'LINKEDIN']).default('GOOGLE'),
  role: z.enum(['CUSTOMER', 'DRIVER', 'ADMIN', 'FLEET_OWNER', 'WORKER']).optional().default('WORKER'),
  fcmToken: z.string().optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type SocialLoginInput = z.infer<typeof socialLoginSchema>;