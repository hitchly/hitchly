import { expo } from "@better-auth/expo";
import { db } from "@hitchly/db/client";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { emailClient } from "../lib/email";

export const auth = betterAuth({
  plugins: [
    expo(),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        emailClient.sendOtp(email, otp).catch((err) => {
          console.error("Failed to send OTP email:", err);
        });
      },
      sendVerificationOnSignUp: true,
    }),
  ],

  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),

  trustedOrigins: ["null", "exp://", "mobile://"],

  advanced: {
    defaultCookieAttributes: {
      secure: false,
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
