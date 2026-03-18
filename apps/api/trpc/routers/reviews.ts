import { db } from "@hitchly/db/client";
import { reviews, trips } from "@hitchly/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

export const reviewsRouter = router({
  submitRating: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        targetUserId: z.string(),
        rating: z.number().min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const trip = await db.query.trips.findFirst({
        where: eq(trips.id, input.tripId),
      });

      if (!trip)
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });

      if (input.targetUserId === ctx.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot rate yourself",
        });
      }

      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const existingReview = await db.query.reviews.findFirst({
        where: and(
          eq(reviews.reviewerId, ctx.userId),
          eq(reviews.targetUserId, input.targetUserId),
          eq(reviews.tripId, input.tripId)
        ),
      });

      if (existingReview) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already rated this user",
        });
      }

      await db.insert(reviews).values({
        reviewerId: ctx.userId,
        targetUserId: input.targetUserId,
        tripId: input.tripId,
        rating: input.rating,
      });

      return { success: true };
    }),

  getUserScore: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const result = await db
        .select({
          average: sql<number>`avg(${reviews.rating})`,
          count: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(eq(reviews.targetUserId, input.userId));

      const avgNum =
        typeof result[0]?.average === "number"
          ? result[0].average
          : typeof result[0]?.average === "string"
            ? Number.parseFloat(result[0].average)
            : Number.NaN;

      const average = Number.isFinite(avgNum) ? avgNum.toFixed(1) : "New";

      const countRaw = result[0]?.count;
      const count =
        typeof countRaw === "number"
          ? countRaw
          : typeof countRaw === "string"
            ? Number.parseInt(countRaw, 10)
            : 0;

      return {
        average,
        count: Number.isFinite(count) ? count : 0,
      };
    }),
});
