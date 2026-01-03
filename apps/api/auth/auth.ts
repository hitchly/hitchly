import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "../config/env";
import { db } from "../db";

export const auth = betterAuth({
  plugins: [expo()],

  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),

  emailAndPassword: {
    enabled: true,
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
    env.origins.client, // Keep your existing web client
    "mobile://", // The scheme you defined in auth-client.ts
    "exp://", // Generic Expo scheme
    "http://192.168.2.13:8081", // The Metro bundler origin
    // Allow wildcards for dev IPs if needed:
    "http://192.168.2.13:*",
  ],
});
