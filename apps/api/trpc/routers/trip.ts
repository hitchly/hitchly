import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import {
  MAX_SEATS,
  TIME_WINDOW_MIN,
  trips,
  tripRequests,
  users,
} from "../../db/schema";
import { protectedProcedure, router } from "../trpc";

// Zod schemas for validation
const createTripInputSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  departureTime: z.date(),
  availableSeats: z.number().int().min(1).max(MAX_SEATS),
});

const updateTripInputSchema = createTripInputSchema.partial();

const tripFiltersSchema = z.object({
  userId: z.string().optional(),
  status: z.enum(["pending", "active", "completed", "cancelled"]).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// Helper functions
function validateTripInput(tripData: {
  departureTime: Date;
  availableSeats: number;
}) {
  const now = new Date();
  const minDepartureTime = new Date(
    now.getTime() + TIME_WINDOW_MIN * 60 * 1000
  );

  if (tripData.departureTime < minDepartureTime) {
    throw new Error(
      `Departure time must be at least ${TIME_WINDOW_MIN} minutes in the future`
    );
  }

  if (tripData.availableSeats < 1 || tripData.availableSeats > MAX_SEATS) {
    throw new Error(`Available seats must be between 1 and ${MAX_SEATS}`);
  }
}

type Trip = typeof trips.$inferSelect;

function filterTripsByTime(
  tripList: Trip[],
  window?: { start: Date; end: Date }
) {
  if (!window) return tripList;
  return tripList.filter(
    (trip) =>
      trip.departureTime >= window.start && trip.departureTime <= window.end
  );
}

/**
 * Trip Router
 * Handles trip creation, retrieval, updates, and cancellation.
 */
export const tripRouter = router({
  /**
   * Create a new trip
   */
  createTrip: protectedProcedure
    .input(createTripInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate user is verified
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, ctx.userId!));

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.emailVerified) {
        throw new Error("Email must be verified to create trips");
      }

      // Validate trip input
      validateTripInput({
        departureTime: input.departureTime,
        availableSeats: input.availableSeats,
      });

      // Generate trip ID
      const tripId = `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create trip
      const [trip] = await ctx.db
        .insert(trips)
        .values({
          id: tripId,
          driverId: ctx.userId!,
          origin: input.origin,
          destination: input.destination,
          departureTime: input.departureTime,
          availableSeats: input.availableSeats,
          status: "pending",
        })
        .returning();

      return trip;
    }),

  /**
   * Get trips with optional filters
   */
  getTrips: protectedProcedure
    .input(tripFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input?.userId) {
        conditions.push(eq(trips.driverId, input.userId));
      }

      if (input?.status) {
        conditions.push(eq(trips.status, input.status));
      }

      if (input?.startDate) {
        conditions.push(gte(trips.departureTime, input.startDate));
      }

      if (input?.endDate) {
        conditions.push(lte(trips.departureTime, input.endDate));
      }

      const results = await ctx.db
        .select()
        .from(trips)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(trips.departureTime);

      // Apply time filtering if needed
      if (input?.startDate && input?.endDate) {
        return filterTripsByTime(results, {
          start: input.startDate,
          end: input.endDate,
        });
      }

      return results;
    }),

  /**
   * Get a single trip by ID
   */
  getTripById: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId));

      if (!trip) {
        throw new Error("Trip not found");
      }

      // Get trip requests for this trip
      const requests = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.tripId, input.tripId));

      return {
        ...trip,
        requests,
      };
    }),

  /**
   * Update a trip
   */
  updateTrip: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        updates: updateTripInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check trip exists and user owns it
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId));

      if (!trip) {
        throw new Error("Trip not found");
      }

      if (trip.driverId !== ctx.userId) {
        throw new Error("Unauthorized: You can only update your own trips");
      }

      // Can only update pending trips
      if (trip.status !== "pending") {
        throw new Error("Can only update pending trips");
      }

      // Validate updates if provided
      if (input.updates.departureTime || input.updates.availableSeats) {
        validateTripInput({
          departureTime: input.updates.departureTime ?? trip.departureTime,
          availableSeats: input.updates.availableSeats ?? trip.availableSeats,
        });
      }

      // Update trip
      const [updatedTrip] = await ctx.db
        .update(trips)
        .set({
          ...input.updates,
          updatedAt: new Date(),
        })
        .where(eq(trips.id, input.tripId))
        .returning();

      return updatedTrip;
    }),

  /**
   * Cancel a trip
   */
  cancelTrip: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check trip exists and user owns it
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId));

      if (!trip) {
        throw new Error("Trip not found");
      }

      if (trip.driverId !== ctx.userId) {
        throw new Error("Unauthorized: You can only cancel your own trips");
      }

      // Can only cancel pending or active trips
      if (trip.status === "completed" || trip.status === "cancelled") {
        throw new Error("Cannot cancel a completed or already cancelled trip");
      }

      // Update trip status
      const [cancelledTrip] = await ctx.db
        .update(trips)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(trips.id, input.tripId))
        .returning();

      // Cancel all pending trip requests
      await ctx.db
        .update(tripRequests)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.status, "pending")
          )
        );

      return { success: true, trip: cancelledTrip };
    }),
});
