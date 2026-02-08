import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { complaints } from "@hitchly/db/schema";
import { protectedProcedure, router } from "../trpc";

export const complaintsRouter = router({
  // Complaint for a user regarding another user
  createComplaint: protectedProcedure
    .input(
      z.object({
        targetUserId: z.string().min(1),
        content: z.string().min(1),
        rideId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(complaints).values({
        reporterUserId: ctx.userId!,
        targetUserId: input.targetUserId,
        content: input.content,
        rideId: input.rideId ?? null,
      });

      return { success: true };
    }),

  /**
   * Get complaints created by the current user
   */
  getMyComplaints: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(complaints)
      .where(eq(complaints.reporterUserId, ctx.userId!))
      .orderBy(desc(complaints.createdAt));
  }),
});
