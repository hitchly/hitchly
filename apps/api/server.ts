import "dotenv/config";

import { db } from "@hitchly/db/client";
import { stripeConnectAccounts, users } from "@hitchly/db/schema";
import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import type { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import Stripe from "stripe";

import { auth } from "./auth/auth";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers";

const app = new Hono();

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow local development from Expo - return origin or fallback to empty string
      return origin;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-trpc-source"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c: Context) => {
  return auth.handler(c.req.raw);
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError: ({
      path,
      error,
    }: {
      path: string | undefined;
      error: TRPCError;
    }) => {
      // eslint-disable-next-line no-console
      console.error(
        `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
      );
    },
  })
);

app.onError((err: Error, c: Context) => {
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

app.get("/", (c: Context) => {
  return c.text("🚀 Hitchly API is running on Hono!");
});

// Handle Stripe Connect redirects
app.get("/stripe/return", (c: Context) => {
  return c.redirect("hitchly://stripe-callback?status=success");
});

app.get("/stripe/refresh", (c: Context) => {
  return c.redirect("hitchly://driver-payouts");
});

// Stripe Webhook handler for Connect and Identity updates
app.post("/stripe/webhook", async (c: Context) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return c.json({ error: "Stripe secret key not configured" }, 500);
  }

  const stripe = new Stripe(stripeSecretKey);
  const sig = c.req.header("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await c.req.text();

  // Check if we're using Stripe in test mode
  const isStripeTestMode = () => {
    return stripeSecretKey.startsWith("sk_test_");
  };

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("❌ Webhook signature verification failed:", message);
    return c.json({ error: "Webhook signature verification failed" }, 400);
  }

  // 1. Handle Connect account updates
  if (event.type === "account.updated") {
    const account = event.data.object;
    const accountId = account.id;

    const onboardingComplete = account.details_submitted;
    const payoutsEnabled = account.payouts_enabled;

    try {
      await db
        .update(stripeConnectAccounts)
        .set({
          onboardingComplete,
          payoutsEnabled,
        })
        .where(eq(stripeConnectAccounts.stripeAccountId, accountId));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown database error";
      // eslint-disable-next-line no-console
      console.error(`❌ Failed to update account ${accountId}:`, message);
    }
  }

  // 2. Handle completed identity verification
  if (event.type === "identity.verification_session.verified") {
    const sessionSummary = event.data.object;
    const userId = sessionSummary.metadata.userId;

    if (userId) {
      try {
        // Expand the session to read the extracted document details
        const session = await stripe.identity.verificationSessions.retrieve(
          sessionSummary.id,
          { expand: ["verified_outputs"] }
        );

        const state = session.verified_outputs?.address?.state;
        const stateOrProvince = state ? state.toLowerCase() : "unknown";

        const isOntario =
          stateOrProvince === "on" || stateOrProvince === "ontario";

        if (isOntario || isStripeTestMode()) {
          // eslint-disable-next-line no-console
          console.log(`✅ Driver verification complete for user ${userId}`);

          await db
            .update(users)
            .set({ isVerifiedDriver: true })
            .where(eq(users.id, userId));
        } else {
          // eslint-disable-next-line no-console
          console.log(
            `⚠️ User ${userId} verified a license, but it was not from Ontario. State found: ${stateOrProvince}`
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown Stripe API error";
        // eslint-disable-next-line no-console
        console.error(
          `❌ Failed to update verification status for user ${userId}:`,
          message
        );
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(
        "⚠️ Webhook received, but no userId found in metadata. Did you use 'stripe trigger'?"
      );
    }
  }

  // 3. Handle failed/canceled verifications
  if (
    event.type === "identity.verification_session.requires_input" ||
    event.type === "identity.verification_session.canceled"
  ) {
    const session = event.data.object;
    const userId = session.metadata.userId ?? "unknown";
    // eslint-disable-next-line no-console
    console.log(`⚠️ Verification failed or canceled for user: ${userId}`);
  }

  return c.json({ received: true });
});

const port = Number(process.env.PORT) || 4000;

serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
});
