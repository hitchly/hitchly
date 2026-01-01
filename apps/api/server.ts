import * as trpcExpress from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import express, { Express } from "express";
import { auth } from "./auth/auth";
import { createContext } from "./trpc/context";
import { appRouter } from "./trpc/routers";

export function createServer(): Express {
  const app = express();

  app.all("/api/auth/*", toNodeHandler(auth));

  app.use(express.json());

  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.get("/", (_req, res) => {
    res.send("🚀 API is alive! Auth → /api/auth/*  tRPC → /trpc");
  });

  return app;
}
