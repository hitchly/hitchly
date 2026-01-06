import { expo } from "@better-auth/expo";
import { db } from "@hitchly/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { sendOTPEmail } from "../lib/email";

export const auth = betterAuth({
  plugins: [
    expo(),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await sendOTPEmail(email, otp);
      },
      sendVerificationOnSignUp: true,
    }),
  ],

  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),

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

  trustedOrigins: [
    process.env.CLIENT_ORIGIN ?? "http://localhost:3000", // Keep your existing web client
    "mobile://", // The scheme you defined in auth-client.ts
    "exp://", // Generic Expo scheme
    "http://192.168.2.13:8081", // The Metro bundler origin
    // Allow wildcards for dev IPs if needed:
    "http://192.168.2.13:*",
  ],
});
