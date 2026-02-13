// apps/api/trpc/context.ts
import { db } from "@hitchly/db/client";
import { auth } from "../auth/auth";
export async function createContext({ req, resHeaders }) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return {
    req,
    db,
    userId: session?.user?.id ?? undefined,
    resHeaders,
  };
}
