import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { db } from "@hitchly/db/client";
import { eq } from "@hitchly/db/client";
import { users } from "@hitchly/db/schema";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx });
});

const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { role: true },
  });

  if (user?.role !== "admin") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

export const adminProcedure = protectedProcedure.use(isAdmin);
