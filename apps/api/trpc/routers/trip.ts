import { and, eq, gte, lte, ne, or } from "drizzle-orm";
import { z } from "zod";
import {
  MAX_SEATS,
  TIME_WINDOW_MIN,
  trips,
  tripRequests,
  users,
} from "../../db/schema";
import { protectedProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";

// Zod schemas for validation
const createTripInputSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  departureTime: z.coerce.date(),
  availableSeats: z.number().int().min(1).max(MAX_SEATS),
});

const updateTripInputSchema = createTripInputSchema.partial();

const tripFiltersSchema = z.object({
  userId: z.string().optional(),
  status: z.enum(["pending", "active", "completed", "cancelled"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
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
      const tripId = crypto.randomUUID();

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
   * By default, returns trips for the current user (driver)
   */
  getTrips: protectedProcedure
    .input(tripFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      const conditions = [];

      // Filter by userId if provided, otherwise filter by current user
      const userId = input?.userId ?? ctx.userId!;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required",
        });
      }
      conditions.push(eq(trips.driverId, userId));

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

  // ============================================
  // TRIP REQUEST ENDPOINTS
  // ============================================

  createTripRequest: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const riderId = ctx.userId!;

      // Get trip and validate
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      // Validate rider is not the driver
      if (trip.driverId === riderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot request to join your own trip",
        });
      }

      // Validate trip has available seats
      if (trip.availableSeats <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This trip has no available seats",
        });
      }

      // Validate trip status
      if (trip.status !== "pending" && trip.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can only request to join pending or active trips",
        });
      }

      // Check for existing request
      const [existingRequest] = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.riderId, riderId),
            or(
              eq(tripRequests.status, "pending"),
              eq(tripRequests.status, "accepted")
            )
          )
        )
        .limit(1);

      if (existingRequest) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You already have a pending or accepted request for this trip",
        });
      }

      // Create trip request
      const requestId = crypto.randomUUID();
      const [request] = await ctx.db
        .insert(tripRequests)
        .values({
          id: requestId,
          tripId: input.tripId,
          riderId,
          status: "pending",
        })
        .returning();

      return request;
    }),

  getTripRequests: protectedProcedure
    .input(
      z.object({
        tripId: z.string().optional(),
        riderId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId!;
      const conditions = [];

      if (input.tripId) {
        // Driver viewing requests for their trip
        const [trip] = await ctx.db
          .select()
          .from(trips)
          .where(eq(trips.id, input.tripId))
          .limit(1);

        if (!trip) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Trip not found",
          });
        }

        if (trip.driverId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view requests for your own trips",
          });
        }

        conditions.push(eq(tripRequests.tripId, input.tripId));
      } else if (input.riderId) {
        // Viewing requests by a specific rider (must be self)
        if (input.riderId !== userId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view your own requests",
          });
        }
        conditions.push(eq(tripRequests.riderId, input.riderId));
      } else {
        // Default: get requests for current user's trips (if driver) or own requests (if rider)
        // For simplicity, return user's own requests
        conditions.push(eq(tripRequests.riderId, userId));
      }

      const requests = await ctx.db
        .select({
          id: tripRequests.id,
          tripId: tripRequests.tripId,
          riderId: tripRequests.riderId,
          status: tripRequests.status,
          createdAt: tripRequests.createdAt,
          updatedAt: tripRequests.updatedAt,
          trip: trips,
          rider: users,
        })
        .from(tripRequests)
        .where(and(...conditions))
        .leftJoin(trips, eq(tripRequests.tripId, trips.id))
        .leftJoin(users, eq(tripRequests.riderId, users.id))
        .orderBy(tripRequests.createdAt);

      // Filter out requests for cancelled trips or trips that don't exist
      return requests.filter((req) => {
        if (!req.trip) return false;
        return req.trip.status !== "cancelled";
      });
    }),

  acceptTripRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const driverId = ctx.userId!;

      // Get request with trip
      const [request] = await ctx.db
        .select({
          request: tripRequests,
          trip: trips,
        })
        .from(tripRequests)
        .where(eq(tripRequests.id, input.requestId))
        .leftJoin(trips, eq(tripRequests.tripId, trips.id))
        .limit(1);

      if (!request || !request.trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip request not found",
        });
      }

      // Validate driver owns the trip
      if (request.trip.driverId !== driverId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only accept requests for your own trips",
        });
      }

      // Validate request is pending
      if (request.request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only accept pending requests",
        });
      }

      // Validate trip has available seats
      if (request.trip.availableSeats <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Trip has no available seats",
        });
      }

      // Update request status
      const [acceptedRequest] = await ctx.db
        .update(tripRequests)
        .set({
          status: "accepted",
          updatedAt: new Date(),
        })
        .where(eq(tripRequests.id, input.requestId))
        .returning();

      // Decrement available seats
      await ctx.db
        .update(trips)
        .set({
          availableSeats: request.trip.availableSeats - 1,
          updatedAt: new Date(),
        })
        .where(eq(trips.id, request.trip.id));

      return acceptedRequest;
    }),

  rejectTripRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const driverId = ctx.userId!;

      // Get request with trip
      const [request] = await ctx.db
        .select({
          request: tripRequests,
          trip: trips,
        })
        .from(tripRequests)
        .where(eq(tripRequests.id, input.requestId))
        .leftJoin(trips, eq(tripRequests.tripId, trips.id))
        .limit(1);

      if (!request || !request.trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip request not found",
        });
      }

      // Validate driver owns the trip
      if (request.trip.driverId !== driverId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only reject requests for your own trips",
        });
      }

      // Validate request is pending
      if (request.request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only reject pending requests",
        });
      }

      // Update request status
      const [rejectedRequest] = await ctx.db
        .update(tripRequests)
        .set({
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(eq(tripRequests.id, input.requestId))
        .returning();

      return rejectedRequest;
    }),

  cancelTripRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const riderId = ctx.userId!;

      // Get request with trip
      const [request] = await ctx.db
        .select({
          request: tripRequests,
          trip: trips,
        })
        .from(tripRequests)
        .where(eq(tripRequests.id, input.requestId))
        .leftJoin(trips, eq(tripRequests.tripId, trips.id))
        .limit(1);

      if (!request || !request.trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip request not found",
        });
      }

      // Validate rider owns the request
      if (request.request.riderId !== riderId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel your own requests",
        });
      }

      // Validate request can be cancelled
      if (request.request.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request is already cancelled",
        });
      }

      const wasAccepted = request.request.status === "accepted";

      // Update request status
      const [cancelledRequest] = await ctx.db
        .update(tripRequests)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(tripRequests.id, input.requestId))
        .returning();

      // If request was accepted, increment available seats
      if (wasAccepted) {
        await ctx.db
          .update(trips)
          .set({
            availableSeats: request.trip.availableSeats + 1,
            updatedAt: new Date(),
          })
          .where(eq(trips.id, request.trip.id));
      }

      return cancelledRequest;
    }),

  getAvailableTrips: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const riderId = ctx.userId!;

      // Get all pending/active trips
      const conditions = [
        or(eq(trips.status, "pending"), eq(trips.status, "active")),
        ne(trips.driverId, riderId), // Exclude trips where user is the driver
        gte(trips.availableSeats, 1), // Only trips with available seats
      ];

      if (input?.startDate) {
        conditions.push(gte(trips.departureTime, input.startDate));
      }

      if (input?.endDate) {
        conditions.push(lte(trips.departureTime, input.endDate));
      }

      const allTrips = await ctx.db
        .select()
        .from(trips)
        .where(and(...conditions))
        .orderBy(trips.departureTime);

      // Get existing requests by this rider
      const existingRequests = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.riderId, riderId),
            or(
              eq(tripRequests.status, "pending"),
              eq(tripRequests.status, "accepted")
            )
          )
        );

      const existingTripIds = new Set(existingRequests.map((r) => r.tripId));

      // Filter out trips where rider already has a pending/accepted request
      return allTrips.filter((trip) => !existingTripIds.has(trip.id));
    }),
});
