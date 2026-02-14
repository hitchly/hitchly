import {
  reviews,
  stripeConnectAccounts,
  trips,
  users,
} from "@hitchly/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import z from "zod";

import { protectedProcedure, router } from "../../trpc";

export const usersRouter = router({
  metrics: protectedProcedure
    .output(
      z.object({
        kpis: z.object({
          total: z.number(),
          pending: z.number(),
          drivers: z.number(),
          banned: z.number(),
        }),
        users: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            status: z.enum(["verified", "pending", "banned"]),
            rating: z.number(),
            tripsCompleted: z.number(),
            joinedDate: z.string(),
          })
        ),
      })
    )
    .query(async ({ ctx }) => {
      // 1. KPI Aggregations (Individual counts to avoid raw SQL helpers)
      const totalRes = await ctx.db.select({ val: count() }).from(users);
      const bannedRes = await ctx.db
        .select({ val: count() })
        .from(users)
        .where(eq(users.banned, true));
      const pendingRes = await ctx.db
        .select({ val: count() })
        .from(users)
        .where(eq(users.emailVerified, false));
      const driverRes = await ctx.db
        .select({ val: count() })
        .from(stripeConnectAccounts)
        .where(eq(stripeConnectAccounts.onboardingComplete, true));

      // 2. Fetch Recent Users
      const recentUsers = await ctx.db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
        limit: 10,
      });

      // 3. Enriched Mapping
      const enrichedUsers = await Promise.all(
        recentUsers.map(async (u) => {
          const tripsCountRes = await ctx.db
            .select({ val: count() })
            .from(trips)
            .where(
              and(eq(trips.driverId, u.id), eq(trips.status, "completed"))
            );

          const userReviews = await ctx.db
            .select({ rating: reviews.rating })
            .from(reviews)
            .where(eq(reviews.targetUserId, u.id));

          const totalRating = userReviews.reduce((acc, r) => acc + r.rating, 0);
          const avgRating =
            userReviews.length > 0 ? totalRating / userReviews.length : 0;

          let userStatus: "verified" | "pending" | "banned" = "pending";
          if (u.banned) {
            userStatus = "banned";
          } else if (u.emailVerified) {
            userStatus = "verified";
          }

          return {
            id: u.id,
            name: u.name,
            email: u.email,
            status: userStatus,
            rating: avgRating,
            tripsCompleted: tripsCountRes[0]?.val ?? 0,
            joinedDate: u.createdAt.toISOString().split("T")[0] ?? "",
          };
        })
      );

      return {
        kpis: {
          total: totalRes[0]?.val ?? 0,
          pending: pendingRes[0]?.val ?? 0,
          drivers: driverRes[0]?.val ?? 0,
          banned: bannedRes[0]?.val ?? 0,
        },
        users: enrichedUsers,
      };
    }),

  verify: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, input.userId));
    }),

  toggleBan: protectedProcedure
    .input(z.object({ userId: z.string(), shouldBan: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db
        .update(users)
        .set({ banned: input.shouldBan })
        .where(eq(users.id, input.userId));
    }),
});
