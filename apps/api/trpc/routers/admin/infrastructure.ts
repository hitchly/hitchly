import { routes, tripRequests, users, verifications } from "@hitchly/db/schema";
import { count, desc, gt, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../../trpc";

export const infrastructureRouter = router({
  metrics: protectedProcedure
    .output(
      z.object({
        kpis: z.object({
          latency: z.number(),
          mobileInstalls: z.number(),
          cacheCount: z.number(),
        }),
        quota: z.object({
          directions: z.number(),
          geocoding: z.number(),
        }),
        logs: z.array(
          z.object({
            time: z.date(),
            message: z.string(),
            type: z.literal("info"),
          })
        ),
      })
    )
    .query(async ({ ctx }) => {
      // 1. Measure DB Latency
      const start = performance.now();
      // Use findFirst instead of raw SQL to keep types clean
      await ctx.db.query.users.findFirst({ columns: { id: true } });
      const dbLatency = Math.round(performance.now() - start);

      // 2. Mobile Installs
      const mobileStats = await ctx.db
        .select({ value: count() })
        .from(users)
        .where(isNotNull(users.pushToken));

      // 3. Cache Stats
      const routeStats = await ctx.db.select({ value: count() }).from(routes);

      // 4. Quota Usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthlyUsage = await ctx.db
        .select({ value: count() })
        .from(tripRequests)
        .where(gt(tripRequests.createdAt, startOfMonth));

      // 5. System Logs
      const recentLogs = await ctx.db.query.verifications.findMany({
        orderBy: [desc(verifications.createdAt)],
        limit: 5,
        columns: { identifier: true, createdAt: true },
      });

      return {
        kpis: {
          latency: dbLatency,
          mobileInstalls: mobileStats[0]?.value ?? 0,
          cacheCount: routeStats[0]?.value ?? 0,
        },
        quota: {
          directions: monthlyUsage[0]?.value ?? 0,
          geocoding: (monthlyUsage[0]?.value ?? 0) * 2,
        },
        logs: recentLogs.map((log) => ({
          time: log.createdAt,
          message: `Verification processed for ${log.identifier}`,
          type: "info" as const,
        })),
      };
    }),
});
