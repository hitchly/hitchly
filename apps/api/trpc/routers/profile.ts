import {
  updatePreferencesSchema,
  updateProfileSchema,
  updateVehicleSchema,
} from "@hitchly/db";
import { and, eq } from "@hitchly/db/client";
import {
  preferences,
  profiles,
  tripRequests,
  trips,
  users,
  vehicles,
} from "@hitchly/db/schema";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../trpc";

const PLACEHOLDER_FARE_CENTS_PER_PASSENGER = 750; // $7.50 placeholder

export const profileRouter = router({
  /**
   * getUserProfile()
   * Returns the user's profile, preferences, and vehicle data.
   * Throws NotFoundError if user doesn't exist.
   */
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const userRecord = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
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
          userId: ctx.userId,
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
          userId: ctx.userId,
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
          userId: ctx.userId,
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

  /**
   * getDriverEarnings()
   * Returns driver earnings statistics (lifetime, week, month).
   */
  getDriverEarnings: protectedProcedure.query(async ({ ctx }) => {
    const driverId = ctx.userId;
    const now = new Date();

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedTrips = await ctx.db
      .select()
      .from(trips)
      .where(and(eq(trips.driverId, driverId), eq(trips.status, "completed")));

    // Note: we don't have a clean "trip completed at" field; use trip.updatedAt as proxy.
    const completedTripsThisWeek = completedTrips.filter(
      (t) => t.updatedAt >= weekStart
    );
    const completedTripsThisMonth = completedTrips.filter(
      (t) => t.updatedAt >= monthStart
    );

    // Placeholder earnings: $7.50 per completed passenger request on any of driver's trips.
    // Since tripRequests aren't filtered by driverId here, we calculate per trip via query below.
    const perTripPassengerCounts = await Promise.all(
      completedTrips.map(async (t) => {
        const rows = await ctx.db
          .select()
          .from(tripRequests)
          .where(
            and(
              eq(tripRequests.tripId, t.id),
              eq(tripRequests.status, "completed")
            )
          );
        return {
          tripId: t.id,
          count: rows.length,
          updatedAt: t.updatedAt,
        };
      })
    );

    const lifetimeCents = perTripPassengerCounts.reduce(
      (sum, r) => sum + r.count * PLACEHOLDER_FARE_CENTS_PER_PASSENGER,
      0
    );
    const weekCents = perTripPassengerCounts
      .filter((r) => r.updatedAt >= weekStart)
      .reduce(
        (sum, r) => sum + r.count * PLACEHOLDER_FARE_CENTS_PER_PASSENGER,
        0
      );
    const monthCents = perTripPassengerCounts
      .filter((r) => r.updatedAt >= monthStart)
      .reduce(
        (sum, r) => sum + r.count * PLACEHOLDER_FARE_CENTS_PER_PASSENGER,
        0
      );

    const completedTripCount = completedTrips.length;
    const avgPerTripCents =
      completedTripCount === 0
        ? 0
        : Math.round(lifetimeCents / completedTripCount);

    return {
      totals: {
        lifetimeCents,
        weekCents,
        monthCents,
      },
      stats: {
        completedTripCount,
        avgPerTripCents,
      },
      placeholders: {
        completedTripsThisWeek: completedTripsThisWeek.length,
        completedTripsThisMonth: completedTripsThisMonth.length,
      },
    };
  }),

  /**
   * updatePushToken()
   * Updates the user's Expo push notification token.
   */
  updatePushToken: protectedProcedure
    .input(z.object({ pushToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({ pushToken: input.pushToken })
        .where(eq(users.id, ctx.userId));
      return { success: true };
    }),

  /**
   * getBanStatus()
   * Returns the user's ban status.
   * TODO: Add banned and banReason fields to users schema
   */
  getBanStatus: protectedProcedure.query(() => {
    // TODO: Uncomment when banned/banReason fields are added to users schema
    // const user = await ctx.db.query.users.findFirst({
    //   where: eq(users.id, ctx.userId!),
    //   columns: { banned: true, banReason: true },
    // });
    //
    // return {
    //   isBanned: user?.banned || false,
    //   reason: user?.banReason || "Violation of Terms",
    // };

    // Placeholder until schema is updated
    return {
      isBanned: false,
      reason: null,
    };
  }),
});
