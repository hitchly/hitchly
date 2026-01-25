import { and, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  MAX_SEATS,
  TIME_WINDOW_MIN,
  trips,
  tripRequests,
  users,
} from "@hitchly/db/schema";
import { geocodeAddress } from "../../services/googlemaps";
import { protectedProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";

// Zod schemas for validation
const createTripInputSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  departureTime: z.coerce.date(),
  maxSeats: z.number().int().min(1).max(MAX_SEATS),
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
  maxSeats: number;
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

  if (tripData.maxSeats < 1 || tripData.maxSeats > MAX_SEATS) {
    throw new Error(`Max seats must be between 1 and ${MAX_SEATS}`);
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
        maxSeats: input.maxSeats,
      });

      // Geocode addresses to get coordinates
      // #region agent log
      await fetch(
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "trip.ts:97",
            message: "Before geocoding addresses",
            data: { origin: input.origin, destination: input.destination },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "geocode-debug",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion

      const [originCoords, destCoords] = await Promise.all([
        geocodeAddress(input.origin),
        geocodeAddress(input.destination),
      ]);

      // #region agent log
      await fetch(
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "trip.ts:102",
            message: "After geocoding addresses",
            data: {
              originCoords,
              destCoords,
              hasOrigin: !!originCoords,
              hasDest: !!destCoords,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "geocode-debug",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion

      if (!originCoords || !destCoords) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Failed to geocode addresses. The Google Maps Geocoding API may not be enabled in your project, or your API key may have restrictions preventing its use. Please:\n1. Enable the Geocoding API at https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com\n2. Check your API key restrictions at https://console.cloud.google.com/apis/credentials - ensure 'Geocoding API' is in the allowed APIs list\n3. Verify your API key has no application restrictions blocking your requests",
        });
      }

      // Generate trip ID
      const tripId = crypto.randomUUID();

      // Create trip with both addresses and coordinates
      const [trip] = await ctx.db
        .insert(trips)
        .values({
          id: tripId,
          driverId: ctx.userId!,
          origin: input.origin,
          destination: input.destination,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          destLat: destCoords.lat,
          destLng: destCoords.lng,
          departureTime: input.departureTime,
          maxSeats: input.maxSeats,
          bookedSeats: 0,
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
      if (input.updates.departureTime || input.updates.maxSeats) {
        validateTripInput({
          departureTime: input.updates.departureTime ?? trip.departureTime,
          maxSeats: input.updates.maxSeats ?? trip.maxSeats,
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
    .input(
      z.object({
        tripId: z.string(),
        pickupLat: z.number(),
        pickupLng: z.number(),
      })
    )
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
      const availableSeats = trip.maxSeats - trip.bookedSeats;
      if (availableSeats <= 0) {
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

      // Create trip request with pickup coordinates
      const requestId = crypto.randomUUID();
      const [request] = await ctx.db
        .insert(tripRequests)
        .values({
          id: requestId,
          tripId: input.tripId,
          riderId,
          pickupLat: input.pickupLat,
          pickupLng: input.pickupLng,
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
      const availableSeats = request.trip.maxSeats - request.trip.bookedSeats;
      if (availableSeats <= 0) {
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

      // Increment booked seats and update trip status to "active" if this is the first accepted rider
      const newBookedSeats = request.trip.bookedSeats + 1;
      const shouldActivateTrip = request.trip.status === "pending";

      await ctx.db
        .update(trips)
        .set({
          bookedSeats: newBookedSeats,
          status: shouldActivateTrip ? "active" : request.trip.status,
          updatedAt: new Date(),
        })
        .where(eq(trips.id, request.trip.id));

      // #region agent log
      const LOG_ENDPOINT =
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9";
      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "trip.ts:acceptTripRequest",
          message: "Trip request accepted - updating trip status",
          data: {
            tripId: request.trip.id,
            requestId: input.requestId,
            oldStatus: request.trip.status,
            newStatus: shouldActivateTrip ? "active" : request.trip.status,
            oldBookedSeats: request.trip.bookedSeats,
            newBookedSeats,
            shouldActivateTrip,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "trip-status-debug",
          hypothesisId: "J",
        }),
      }).catch(() => {});
      // #endregion

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

      // If request was accepted, decrement booked seats
      if (wasAccepted) {
        await ctx.db
          .update(trips)
          .set({
            bookedSeats: request.trip.bookedSeats - 1,
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
        sql`${trips.maxSeats} - ${trips.bookedSeats} >= 1`, // Only trips with available seats
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

  /**
   * Fix trip status - transitions trips with accepted riders from "pending" to "active"
   * This fixes trips that got stuck in "pending" status due to bugs
   */
  fixTripStatus: protectedProcedure
    .input(z.object({ tripId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const driverId = ctx.userId!;

      // Build query conditions
      const conditions = [eq(trips.driverId, driverId)];
      if (input.tripId) {
        conditions.push(eq(trips.id, input.tripId));
      }
      // Only fix trips that are stuck in "pending" status
      conditions.push(eq(trips.status, "pending"));

      // Get trips that need fixing
      const tripsToFix = await ctx.db
        .select({
          trip: trips,
        })
        .from(trips)
        .where(and(...conditions));

      const fixedTrips = [];

      for (const { trip } of tripsToFix) {
        // Check if this trip has any accepted requests
        const acceptedRequests = await ctx.db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(tripRequests)
          .where(
            and(
              eq(tripRequests.tripId, trip.id),
              eq(tripRequests.status, "accepted")
            )
          );

        const acceptedCount = acceptedRequests[0]?.count ?? 0;

        // If trip has accepted riders but is still "pending", fix it
        if (acceptedCount > 0) {
          await ctx.db
            .update(trips)
            .set({
              status: "active",
              updatedAt: new Date(),
            })
            .where(eq(trips.id, trip.id));

          fixedTrips.push({
            tripId: trip.id,
            acceptedRiders: acceptedCount,
            oldStatus: trip.status,
            newStatus: "active",
          });

          // #region agent log
          const LOG_ENDPOINT =
            "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9";
          fetch(LOG_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "trip.ts:fixTripStatus",
              message: "Fixed stuck trip status",
              data: {
                tripId: trip.id,
                driverId: trip.driverId,
                acceptedRiders: acceptedCount,
                oldStatus: trip.status,
                newStatus: "active",
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "trip-status-fix",
              hypothesisId: "J",
            }),
          }).catch(() => {});
          // #endregion
        }
      }

      return {
        success: true,
        fixedCount: fixedTrips.length,
        fixedTrips,
      };
    }),
});
