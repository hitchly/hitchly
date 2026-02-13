import { saveAddressSchema } from "@hitchly/db";
import { db } from "@hitchly/db/client";
import { profiles } from "@hitchly/db/schema";
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
    .mutation(async () => {
      return { success: true };
    }),
  saveDefaultAddress: protectedProcedure
    .input(saveAddressSchema)
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(profiles)
        .values({
          userId: ctx.userId,
          defaultAddress: input.address,
          defaultLat: input.latitude,
          defaultLong: input.longitude,
          appRole: "rider",
          universityRole: "student",
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            defaultAddress: input.address,
            defaultLat: input.latitude,
            defaultLong: input.longitude,
            updatedAt: new Date(),
          },
        });
      return { success: true };
    }),
});
