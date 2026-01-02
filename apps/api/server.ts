import * as trpcExpress from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import { json } from "body-parser";
import express, { Express } from "express";
import { auth } from "./auth/auth";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers";

export function createServer(): Express {
  const app = express();
  app.use(json());

  // -------------------------------
  // Mount Better-Auth only on its routePrefix
  // -------------------------------
  app.all("/api/auth/*splat", toNodeHandler(auth));

  // -------------------------------
  // tRPC middleware
  // -------------------------------
  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // -------------------------------
  // Health check
  // -------------------------------
  app.get("/", (_req, res) => {
    res.send("🚀 API is alive! Auth → /api/auth/*  tRPC → /trpc");
  });

  return app;
}
