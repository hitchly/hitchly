import express, { Express } from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router";

export function createServer(): Express {
  const app = express();

  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: () => ({}),
    })
  );

  app.get("/", (_req, res) => {
    res.send("🚀 API is alive! Use /trpc for queries.");
  });

  return app;
}
