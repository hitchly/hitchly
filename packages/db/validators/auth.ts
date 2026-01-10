import { z } from "zod";

// 1. Sign In
export const signInSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .refine(
      (email) => email.endsWith("@mcmaster.ca"),
      "Only @mcmaster.ca emails are allowed"
    ),
  password: z.string().min(1, "Password is required"),
});

// 2. Sign Up
export const signUpSchema = z.object({
  name: z.string().min(1, "Full Name is required"),
  email: z
    .string()
    .email("Invalid email address")
    .refine(
      (email) => email.endsWith("@mcmaster.ca"),
      "Only @mcmaster.ca emails are allowed"
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// 3. Verify OTP
export const verifyOtpSchema = z.object({
  otp: z.string().length(6, "Verification code must be 6 digits"),
});

// Types
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
