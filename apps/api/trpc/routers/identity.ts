import { db } from "@hitchly/db/client";
import { users } from "@hitchly/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Check if we're using Stripe in test mode
const isStripeTestMode = () => {
  return STRIPE_SECRET_KEY.startsWith("sk_test_");
};

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
        sessionId: session.id,
      };
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to initialize verification.",
      });
    }
  }),

  checkVerificationSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const session = await stripe.identity.verificationSessions.retrieve(
          input.sessionId,
          { expand: ["verified_outputs"] }
        );

        if (session.status === "verified") {
          const state = session.verified_outputs?.address?.state;
          const stateOrProvince = state ? state.toLowerCase() : "unknown";

          const isOntario =
            stateOrProvince === "on" || stateOrProvince === "ontario";

          if (isOntario || isStripeTestMode()) {
            await db
              .update(users)
              .set({ isVerifiedDriver: true })
              .where(eq(users.id, ctx.userId));

            return { verified: true };
          }

          return {
            verified: false,
            reason: "License is not from Ontario.",
          };
        }

        return { verified: false, status: session.status };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check verification status.",
        });
      }
    }),
});
