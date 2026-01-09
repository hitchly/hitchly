// apps/api/trpc/context.ts
import { db } from "@hitchly/db/client";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/auth";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  return {
    req,
    res,
    db,
    userId: session?.user?.id ?? undefined,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
