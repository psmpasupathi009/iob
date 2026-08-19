import { z } from "zod";
import { OTP_LENGTH, PIN_LENGTH } from "@/lib/auth/constants";

export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const pinSchema = z
  .string()
  .regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `PIN must be ${PIN_LENGTH} digits`);

export const otpSchema = z
  .string()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `OTP must be ${OTP_LENGTH} digits`);

export const checkUserSchema = z.object({
  mobile: mobileSchema,
});

export const sendOtpSchema = z.object({
  mobile: mobileSchema,
  purpose: z.enum(["setup", "forgot_pin"]),
});

export const verifyOtpSchema = z.object({
  mobile: mobileSchema,
  otp: otpSchema,
  purpose: z.enum(["setup", "forgot_pin"]),
});

export const setupPinSchema = z
  .object({
    pin: pinSchema,
    confirmPin: pinSchema,
    otpProofToken: z.string().min(10),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export const loginSchema = z.object({
  userId: z.string().trim().min(3, "Enter User ID"),
  pin: pinSchema,
  captcha: z.string().trim().min(4),
});

export const forgotPinResetSchema = setupPinSchema;

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Enter name"),
  username: z
    .string()
    .trim()
    .min(4, "Enter User ID")
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/, "User ID must be letters or numbers"),
  mobile: mobileSchema,
  pin: pinSchema,
  balance: z.coerce.number().min(0).default(0),
  accountNumber: z.string().trim().optional(),
});

export const patchUserSchema = z.object({
  pin: pinSchema.optional(),
  balance: z.coerce.number().min(0).optional(),
  name: z.string().trim().min(2).optional(),
});

export const addTxnSchema = z.object({
  description: z.string().trim().min(2),
  amount: z.coerce.number().positive(),
  type: z.enum(["CR", "DR"]),
});
