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

const port = Number(process.env.PORT) || 3000;

serve({
  fetch: app.fetch,
  port,
});
