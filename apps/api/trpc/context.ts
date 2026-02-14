// apps/api/trpc/context.ts
import { db } from "@hitchly/db/client";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import { auth } from "../auth/auth";

export async function createContext({
  req,
  resHeaders,
}: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    req,
    db,
    userId: session?.user.id ?? undefined,
    resHeaders,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
