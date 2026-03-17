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
        metadata: {
          // Pass the user ID so the webhook knows who just verified
          userId: ctx.userId,
        },
        options: {
          document: {
            require_id_number: true,
            require_matching_selfie: true,
            require_live_capture: true,
            allowed_types: ["driving_license"],
          },
        },
      });

      // Strict null check ensures ephemeralKeySecret is typed strictly as a string
      if (!session.client_secret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe session created without a client secret",
        });
      }

      return {
        sessionId: session.id,
        // The client_secret acts as the ephemeral key for the mobile SDK
        ephemeralKeySecret: session.client_secret,
      };
    } catch {
      // Omitted the unused 'error' variable binding to satisfy ESLint
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Stripe Identity session",
      });
    }
  }),
});
