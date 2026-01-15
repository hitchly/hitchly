import {
  updatePreferencesSchema,
  updateProfileSchema,
  updateVehicleSchema,
} from "@hitchly/db";
import { eq } from "@hitchly/db/client";
import { preferences, profiles, users, vehicles } from "@hitchly/db/schema";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";

export const profileRouter = router({
  /**
   * getUserProfile()
   * Returns the user's profile, preferences, and vehicle data.
   * Throws NotFoundError if user doesn't exist.
   */
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const userRecord = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId!),
      with: {
        profile: true,
        preferences: true,
        vehicle: true,
      },
    });

    if (!userRecord) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User profile not found",
      });
    }

    return userRecord;
  }),

  /**
   * updateUserProfile()
   * Updates basic profile fields (bio, faculty, roles).
   * Creates the profile record if it doesn't exist (Upsert).
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(profiles)
        .values({
          userId: ctx.userId!,
          ...input,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            ...input,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),

  /**
   * updatePreferences()
   * Updates ride comfort settings.
   */
  updatePreferences: protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(preferences)
        .values({
          userId: ctx.userId!,
          ...input,
        })
        .onConflictDoUpdate({
          target: preferences.userId,
          set: {
            ...input,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),

  /**
   * updateVehicle()
   * Updates driver vehicle information.
   */
  updateVehicle: protectedProcedure
    .input(updateVehicleSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(vehicles)
        .values({
          userId: ctx.userId!,
          ...input,
        })
        .onConflictDoUpdate({
          target: vehicles.userId,
          set: {
            ...input,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),
  getBanStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId!),
      columns: { banned: true, banReason: true },
    });

    return {
      isBanned: user?.banned || false,
      reason: user?.banReason || "Violation of Terms",
    };
  }),
});
