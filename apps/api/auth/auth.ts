/* eslint-disable no-console */
import { expo } from "@better-auth/expo";
import { db } from "@hitchly/db/client";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";

import { emailClient } from "../lib/email";

/** Extra allowed browser origins (e.g. Vercel admin). Comma-separated in BETTER_AUTH_TRUSTED_ORIGINS. */
const extraTrustedOrigins =
  process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    expo(),
    admin(),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        console.log(`[AUTH] Sending OTP to ${email}...`);
        try {
          await emailClient.sendOtp(email, otp);
          console.log(`[AUTH] OTP sent to ${email}`);
        } catch (error) {
          console.error("[AUTH] OTP FAILED:", error);
          throw error;
        }
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
    "http://localhost:4000",
    "https://hitchly.onrender.com",
    // Production admin (also set BETTER_AUTH_TRUSTED_ORIGINS on Render for previews / extra domains)
    "https://hitchly.vercel.app",
    ...extraTrustedOrigins,
  ],

  advanced: {
    defaultCookieAttributes: {
      // Admin (e.g. Vercel) and API (e.g. Render) are different sites. With SameSite=Lax,
      // the session cookie is not sent on credentialed fetch/XHR from the admin origin
      // to the API, so useSession() never sees a session. "none" + Secure fixes that.
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
