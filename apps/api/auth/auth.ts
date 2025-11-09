import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "../config/env";
import { db } from "../db";

export const auth = betterAuth({
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

  trustedOrigins: [env.origins.client],
});
