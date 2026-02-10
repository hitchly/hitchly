import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import "dotenv/config";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth/auth";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers";
import type { TRPCError } from "@trpc/server";

const app = new Hono();

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: (origin: string | undefined): string | undefined => {
      // Allow local development from Expo return origin directly to allow, or return null to block
      return origin || "";
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
      console.error(
        `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
      );
    },
  })
);

app.onError((err: Error, c: Context) => {
  console.error("🔥 Server Error:", err);
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
  return c.redirect("hitchly://driver-payouts"); // Go back to payouts screen to retry
});

// Stripe Webhook handler for Connect account updates
app.post("/stripe/webhook", async (c: Context) => {
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const sig = c.req.header("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const rawBody = await c.req.text();

  let event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      event = JSON.parse(rawBody);
    }
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return c.json({ error: "Webhook signature verification failed" }, 400);
  }

  // Handle Connect account updates
  if (event.type === "account.updated") {
    const account = event.data.object;
    const accountId = account.id;

    const { db } = await import("@hitchly/db/client");
    const { stripeConnectAccounts } = await import("@hitchly/db/schema");
    const { eq } = await import("drizzle-orm");

    const onboardingComplete = account.details_submitted ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;

    try {
      await db
        .update(stripeConnectAccounts)
        .set({
          onboardingComplete,
          payoutsEnabled,
        })
        .where(eq(stripeConnectAccounts.stripeAccountId, accountId));
    } catch (err) {
      console.error(`❌ Failed to update account ${accountId}:`, err);
    }
  }

  return c.json({ received: true });
});

const port = Number(process.env.PORT) || 3000;

serve({
  fetch: app.fetch,
  port,
});
