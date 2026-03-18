import { TRPCError } from "@trpc/server";
import Stripe from "stripe";

import { protectedProcedure, router } from "../trpc";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

export const identityRouter = router({
  createVerificationSession: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const session = await stripe.identity.verificationSessions.create({
        type: "document",
        metadata: { userId: ctx.userId },
      });

      if (!session.url) {
        throw new Error("Stripe did not return a session URL.");
      }

      return {
        url: session.url,
      };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to initialize verification.",
      });
    }
  }),
});
