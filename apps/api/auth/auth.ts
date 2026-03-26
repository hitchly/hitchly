import { expo } from "@better-auth/expo";
import { db } from "@hitchly/db/client";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";

import { emailClient } from "../lib/email";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    expo(),
    admin(),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await emailClient.sendOtp(email, otp);
      },
      sendVerificationOnSignUp: true,
    }),
  ],

  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),

  user: {
    additionalFields: {
      isVerifiedDriver: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
    },
  },

  trustedOrigins: [
    "null",
    "exp://",
    "hitchly://",
    "http://localhost:3000",
    "https://hitchly.onrender.com",
  ],

  advanced: {
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    validateSignUpInput(input: {
      email: string;
      password?: string;
      name?: string;
    }) {
      if (!input.email.endsWith("@mcmaster.ca")) {
        throw new Error("Only @mcmaster.ca emails are allowed");
      }
      return input;
    },
  },
});

export type AuthType = typeof auth;
