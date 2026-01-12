import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { db } from "@hitchly/db/client";
import { eq } from "@hitchly/db/client";
import { admins, reports, users, userAnalytics } from "@hitchly/db/schema";
import { count, desc } from "drizzle-orm";

export const adminRouter = router({
  getAnalytics: publicProcedure
    .input(z.object({ adminId: z.string() }))
    .query(async ({ input }) => {
      const admin = await db.query.admins.findFirst({
        where: eq(admins.userId, input.adminId),
      });
      if (!admin) throw new TRPCError({ code: "UNAUTHORIZED" });

      const userCount = await db.select({ value: count() }).from(users);
      const reportsCount = await db.select({ value: count() }).from(reports);

      return {
        totalUsers: userCount[0].value,
        activeUsers: 1, // Placeholder
        totalRides: 0, // Placeholder
        reportsCount: reportsCount[0].value,
      };
    }),

  getAllUsers: publicProcedure
    .input(z.object({ adminId: z.string() }))
    .query(async ({ input }) => {
      const admin = await db.query.admins.findFirst({
        where: eq(admins.userId, input.adminId),
      });
      if (!admin) throw new TRPCError({ code: "UNAUTHORIZED" });

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

  amIAdmin: publicProcedure
    .input(z.object({ adminId: z.string() }))
    .query(async ({ input }) => {
      const admin = await db.query.admins.findFirst({
        where: eq(admins.userId, input.adminId),
      });
      return { isAdmin: !!admin };
    }),

  warnUser: publicProcedure
    .input(
      z.object({
        adminId: z.string(),
        targetUserId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const admin = await db.query.admins.findFirst({
        where: eq(admins.userId, input.adminId),
      });
      if (!admin) throw new TRPCError({ code: "UNAUTHORIZED" });

      await db.insert(reports).values({
        targetUserId: input.targetUserId,
        adminId: admin.id,
        reason: input.reason,
        type: "warning",
      });

      const warnings = await db
        .select({ count: count() })
        .from(reports)
        .where(eq(reports.targetUserId, input.targetUserId));

      if (warnings[0].count >= 3) {
        console.log(`User ${input.targetUserId} should be BANNED.`);
      }

      return { success: true };
    }),
});
