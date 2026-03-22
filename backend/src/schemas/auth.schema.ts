import { z } from 'zod';

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must be under 15 digits')
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits')
  }),
});
