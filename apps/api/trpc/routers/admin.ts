import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { db } from "@hitchly/db/client";
import { eq } from "@hitchly/db/client";
import { reports, users } from "@hitchly/db/schema";
import { count } from "drizzle-orm";

export const adminRouter = router({
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.userId!),
      columns: { role: true },
    });

    if (user?.role !== "admin") {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const userCount = await db.select({ value: count() }).from(users);
    const reportsCount = await db.select({ value: count() }).from(reports);

    return {
      totalUsers: userCount[0].value,
      activeUsers: 1,
      totalRides: 0,
      reportsCount: reportsCount[0].value,
    };
  }),

  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.userId!),
      columns: { role: true },
    });

    if (user?.role !== "admin") {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        strikeCount: count(reports.id),
      })
      .from(users)
      .leftJoin(reports, eq(reports.targetUserId, users.id))
      .groupBy(users.id)
      .limit(50);
  }),

  amIAdmin: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.userId!),
      columns: { role: true },
    });

    return { isAdmin: user?.role === "admin" };
  }),

  warnUser: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.userId!),
        columns: { role: true },
      });

      if (user?.role !== "admin") {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Add the warning report
      await db.insert(reports).values({
        targetUserId: input.targetUserId,
        adminId: ctx.userId!,
        reason: input.reason,
        type: "warning",
      });

      const warnings = await db
        .select({ count: count() })
        .from(reports)
        .where(eq(reports.targetUserId, input.targetUserId));

      const totalStrikes = warnings[0].count;

      if (totalStrikes >= 3) {
        console.warn(
          `User ${input.targetUserId} has reached 3 strikes. Executing BAN.`
        );

        await db
          .update(users)
          .set({
            banned: true,
            banReason: "Excessive strikes (3+ warnings)",
          })
          .where(eq(users.id, input.targetUserId));
      }

      return { success: true };
    }),
});
