import { z } from 'zod';

// Phone number: accepts international format (e.g. +919876543210 or 10-15 digits with optional +)
export const phoneRegex = /^\+?[1-9]\d{9,14}$/;

export const requestOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(phoneRegex, 'Invalid phone number format. Must include country code, e.g. +919876543210'),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(phoneRegex, 'Invalid phone number format'),
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export const createLoanSchema = z.object({
  friendName: z
    .string({ required_error: 'Friend name is required' })
    .trim()
    .min(1, 'Friend name cannot be empty')
    .max(100, 'Friend name cannot exceed 100 characters'),
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than zero')
    .finite('Amount must be a finite number')
    .max(100_000_000, 'Amount cannot exceed 100,000,000')
    .refine((val) => Number(val.toFixed(2)) === val, {
      message: 'Amount can have at most 2 decimal places',
    }),
  dueDate: z
    .string({ required_error: 'Due date is required' })
    .trim()
    .refine(
      (val) => {
        const parsed = new Date(val);
        return !isNaN(parsed.getTime());
      },
      { message: 'Invalid calendar date format' }
    ),
  receiptUrl: z.string().trim().optional().nullable(),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
