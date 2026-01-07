import { db } from "@hitchly/db";
import { userLocations } from "@hitchly/db/schema";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const locationRouter = router({
  update: protectedProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        heading: z.number().nullable().optional(),
        speed: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!;

      // Upsert: Try to insert, if conflict on userId, update instead
      await db
        .insert(userLocations)
        .values({
          userId,
          latitude: input.latitude,
          longitude: input.longitude,
          heading: input.heading || 0,
          speed: input.speed || 0,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userLocations.userId,
          set: {
            latitude: input.latitude,
            longitude: input.longitude,
            heading: input.heading || 0,
            speed: input.speed || 0,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),
});
