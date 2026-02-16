// TODO: Fix linting errors in this file and re-enable eslint
/* eslint-disable */

import {
  MAX_SEATS,
  TIME_WINDOW_MIN,
  tripRequests,
  trips,
  users,
} from "@hitchly/db/schema";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";

import {
  calculateTripDistance,
  geocodeAddress,
} from "../../services/googlemaps";
import { sendTripNotification } from "../../services/notification";
import {
  calculateFare,
  cancelPaymentHold,
  capturePayment,
  createPaymentHold,
  hasPaymentMethod,
  processTip,
  updatePaymentHold,
} from "../../services/payment";
import { protectedProcedure, router } from "../trpc";

const PLACEHOLDER_FARE_CENTS_PER_PASSENGER = 750; // $7.50 placeholder (teammate will replace with real fare calc)

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
        .where(eq(users.id, ctx.userId));

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
      const [originCoords, destCoords] = await Promise.all([
        geocodeAddress(input.origin),
        geocodeAddress(input.destination),
      ]);
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
          driverId: ctx.userId,
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
   * Returns trips where user is driver OR has a trip request as rider
   */
  getTrips: protectedProcedure
    .input(tripFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      // Filter by userId if provided, otherwise filter by current user
      const userId = input?.userId ?? ctx.userId;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required",
        });
      }

      // Build base conditions for status and date filters
      const baseConditions = [];
      if (input?.status) {
        baseConditions.push(eq(trips.status, input.status));
      }
      if (input?.startDate) {
        baseConditions.push(gte(trips.departureTime, input.startDate));
      }
      if (input?.endDate) {
        baseConditions.push(lte(trips.departureTime, input.endDate));
      }

      // Query trips where user is driver OR has a trip request as rider
      // Using SQL subquery for the rider condition
      const userCondition = or(
        eq(trips.driverId, userId),
        sql`${trips.id} IN (SELECT ${tripRequests.tripId} FROM ${tripRequests} WHERE ${tripRequests.riderId} = ${userId})`
      );

      const whereClause =
        baseConditions.length > 0
          ? and(userCondition, ...baseConditions)
          : userCondition;

      const results = await ctx.db
        .select()
        .from(trips)
        .where(whereClause)
        .orderBy(desc(trips.createdAt));
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      // Get trip requests with rider information
      // Wrap in try-catch to handle cases where requests query fails (e.g., schema issues)
      let requests: any[] = [];
      try {
        // Flatten the query to avoid nested object issues with Drizzle leftJoin
        const requestsData = await ctx.db
          .select({
            id: tripRequests.id,
            tripId: tripRequests.tripId,
            riderId: tripRequests.riderId,
            pickupLat: tripRequests.pickupLat,
            pickupLng: tripRequests.pickupLng,
            dropoffLat: tripRequests.dropoffLat,
            dropoffLng: tripRequests.dropoffLng,
            status: tripRequests.status,
            createdAt: tripRequests.createdAt,
            updatedAt: tripRequests.updatedAt,
            riderPickupConfirmedAt: tripRequests.riderPickupConfirmedAt,
            riderId_user: users.id,
            riderName: users.name,
            riderEmail: users.email,
          })
          .from(tripRequests)
          .leftJoin(users, eq(tripRequests.riderId, users.id))
          .where(eq(tripRequests.tripId, input.tripId));

        // Reconstruct nested rider object
        requests = requestsData.map((req) => ({
          id: req.id,
          tripId: req.tripId,
          riderId: req.riderId,
          pickupLat: req.pickupLat,
          pickupLng: req.pickupLng,
          dropoffLat: req.dropoffLat,
          dropoffLng: req.dropoffLng,
          status: req.status,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
          riderPickupConfirmedAt: req.riderPickupConfirmedAt,
          rider: req.riderId_user
            ? {
                id: req.riderId_user,
                name: req.riderName,
                email: req.riderEmail,
              }
            : null,
        }));
      } catch (error: any) {
        // Log error but continue - return trip with empty requests array
        console.error("Failed to fetch trip requests:", error);
        requests = [];
      }

      // Filter to accepted/on_trip/completed requests for active/in_progress trips
      // For other statuses, return all requests
      const filteredRequests =
        trip.status === "active" || trip.status === "in_progress"
          ? requests.filter(
              (req) =>
                req.status === "accepted" ||
                req.status === "on_trip" ||
                req.status === "completed"
            )
          : requests;

      // Sort by proximity to trip origin if trip has origin coordinates
      let sortedRequests = filteredRequests;
      if (trip.originLat && trip.originLng) {
        sortedRequests = [...filteredRequests].sort((a, b) => {
          if (!a.pickupLat || !a.pickupLng) return 1;
          if (!b.pickupLat || !b.pickupLng) return -1;

          // Simple Euclidean distance calculation
          const distA = Math.sqrt(
            Math.pow(a.pickupLat - trip.originLat!, 2) +
              Math.pow(a.pickupLng - trip.originLng!, 2)
          );
          const distB = Math.sqrt(
            Math.pow(b.pickupLat - trip.originLat!, 2) +
              Math.pow(b.pickupLng - trip.originLng!, 2)
          );
          return distA - distB;
        });
      }

      let driver: {
        id: string;
        name: string | null;
        email: string | null;
      } | null = null;
      try {
        const [driverRow] = await ctx.db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, trip.driverId));
        driver = driverRow ?? null;
      } catch (error: any) {
        console.error("Failed to fetch trip driver:", error);
        driver = null;
      }

      return {
        ...trip,
        driver,
        requests: sortedRequests,
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
      // Send push notification to all accepted riders
      const acceptedRiders = await ctx.db
        .select({ userId: tripRequests.riderId, pushToken: users.pushToken })
        .from(tripRequests)
        .innerJoin(users, eq(tripRequests.riderId, users.id))
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.status, "accepted")
          )
        );

      if (acceptedRiders.length > 0) {
        sendTripNotification(
          acceptedRiders,
          "Trip Cancelled",
          `Your trip from ${trip.origin} to ${trip.destination} has been cancelled by the driver.`,
          { tripId: input.tripId, action: "cancelled" }
        ).catch((err) => {
          console.error("Failed to send cancel notification:", err);
        });

        // Release payment holds for all accepted riders
        const acceptedRequests = await ctx.db
          .select({ id: tripRequests.id })
          .from(tripRequests)
          .where(
            and(
              eq(tripRequests.tripId, input.tripId),
              eq(tripRequests.status, "accepted")
            )
          );

        for (const req of acceptedRequests) {
          cancelPaymentHold(req.id).catch((err) => {
            console.error("Failed to cancel payment hold:", err);
          });
        }

        // Cancel accepted requests
        await ctx.db
          .update(tripRequests)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(tripRequests.tripId, input.tripId),
              eq(tripRequests.status, "accepted")
            )
          );
      }

      return { success: true, trip: cancelledTrip };
    }),

  /**
   * Start a trip (mark as in progress)
   */
  startTrip: protectedProcedure
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
        throw new Error("Unauthorized: You can only start your own trips");
      }

      // Can only start active trips
      if (trip.status !== "active") {
        throw new Error("Can only start trips that are in active status");
      }

      // Update trip status to in_progress
      const [startedTrip] = await ctx.db
        .update(trips)
        .set({
          status: "in_progress",
          updatedAt: new Date(),
        })
        .where(eq(trips.id, input.tripId))
        .returning();
      if (!startedTrip) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update trip status",
        });
      }

      // Send push notification to all accepted riders that trip is starting
      const acceptedRiders = await ctx.db
        .select({ userId: tripRequests.riderId, pushToken: users.pushToken })
        .from(tripRequests)
        .innerJoin(users, eq(tripRequests.riderId, users.id))
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.status, "accepted")
          )
        );

      if (acceptedRiders.length > 0) {
        sendTripNotification(
          acceptedRiders,
          "Trip Starting",
          "Your driver is on the way! Get ready for pickup.",
          { tripId: input.tripId, action: "started" }
        ).catch((err) => {
          console.error("Failed to send start notification:", err);
        });
      }

      return startedTrip;
    }),

  /**
   * Update passenger status (pickup or dropoff)
   */
  updatePassengerStatus: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        requestId: z.string(),
        action: z.enum(["pickup", "dropoff"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check trip exists and user owns it
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId));

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      if (trip.driverId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Unauthorized: You can only update passengers for your own trips",
        });
      }

      // Can only update passengers when trip is in_progress
      if (trip.status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only update passenger status when trip is in progress",
        });
      }

      // Get request
      const [request] = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.id, input.requestId));

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip request not found",
        });
      }

      if (request.tripId !== input.tripId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request does not belong to this trip",
        });
      }
      // Validate status transitions
      if (input.action === "pickup") {
        if (!request.riderPickupConfirmedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Rider has not confirmed pickup yet",
          });
        }
        if (request.status !== "accepted") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only pick up passengers with accepted status",
          });
        }
      } else if (input.action === "dropoff") {
        if (request.status !== "on_trip") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only drop off passengers who are on trip",
          });
        }
      }

      // Update request status
      const newStatus = input.action === "pickup" ? "on_trip" : "completed";
      const [updatedRequest] = await ctx.db
        .update(tripRequests)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(tripRequests.id, input.requestId))
        .returning({
          id: tripRequests.id,
          tripId: tripRequests.tripId,
          riderId: tripRequests.riderId,
          pickupLat: tripRequests.pickupLat,
          pickupLng: tripRequests.pickupLng,
          dropoffLat: tripRequests.dropoffLat,
          dropoffLng: tripRequests.dropoffLng,
          status: tripRequests.status,
          createdAt: tripRequests.createdAt,
          updatedAt: tripRequests.updatedAt,
        });

      if (input.action === "dropoff") {
        const captureResult = await capturePayment(input.requestId);
        if (!captureResult.success) {
          console.error("Payment capture failed:", captureResult.error);
        }
      }

      return updatedRequest;
    }),

  /**
   * Complete trip (mark as completed when all passengers dropped off)
   */
  completeTrip: protectedProcedure
    .input(z.object({ tripId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check trip exists and user owns it
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId));

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      if (trip.driverId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized: You can only complete your own trips",
        });
      }

      // Can only complete trips that are in_progress
      if (trip.status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only complete trips that are in progress",
        });
      }

      // Get all accepted requests for this trip
      const acceptedRequests = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.status, "accepted")
          )
        );

      // Get all on_trip requests
      const onTripRequests = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.status, "on_trip")
          )
        );

      // Verify all passengers are completed
      if (acceptedRequests.length > 0 || onTripRequests.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot complete trip: not all passengers have been dropped off",
        });
      }

      // Update trip status to completed
      const completedAt = new Date();
      const startedAt = trip.updatedAt; // best-available proxy for "trip started" timestamp (set in startTrip)
      const [completedTrip] = await ctx.db
        .update(trips)
        .set({
          status: "completed",
          updatedAt: completedAt,
        })
        .where(eq(trips.id, input.tripId))
        .returning();
      const completedRequests = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.status, "completed")
          )
        );

      const passengerCount = completedRequests.length;
      const durationMinutes =
        startedAt instanceof Date
          ? Math.max(
              0,
              Math.round((completedAt.getTime() - startedAt.getTime()) / 60000)
            )
          : null;

      const perPassenger = await Promise.all(
        completedRequests.map(async (r) => {
          const [rider] = await ctx.db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, r.riderId))
            .limit(1);
          return {
            riderName: rider?.name ?? "Passenger",
            amountCents: PLACEHOLDER_FARE_CENTS_PER_PASSENGER,
          };
        })
      );

      const totalEarningsCents =
        passengerCount * PLACEHOLDER_FARE_CENTS_PER_PASSENGER;

      // Calculate total trip distance using route caching
      let totalDistanceKm: number | null = null;
      if (trip.originLat && trip.originLng && trip.destLat && trip.destLng) {
        const waypoints = completedRequests
          .filter((r) => r.pickupLat && r.pickupLng)
          .map((r) => ({ lat: r.pickupLat, lng: r.pickupLng }));

        const distanceResult = await calculateTripDistance(
          { lat: trip.originLat, lng: trip.originLng },
          { lat: trip.destLat, lng: trip.destLng },
          waypoints
        );

        totalDistanceKm = distanceResult?.distanceKm ?? null;
      }

      const summary = {
        durationMinutes,
        totalEarningsCents,
        passengerCount,
        perPassenger,
        totalDistanceKm,
      };

      // Send push notification to all completed riders
      if (completedRequests.length > 0) {
        const riderIds = completedRequests.map((r) => r.riderId);
        const ridersWithTokens = await ctx.db
          .select({ userId: users.id, pushToken: users.pushToken })
          .from(users)
          .where(
            sql`${users.id} IN (${sql.join(
              riderIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          );

        if (ridersWithTokens.length > 0) {
          sendTripNotification(
            ridersWithTokens,
            "Trip Completed",
            `Your trip from ${trip.origin} to ${trip.destination} is complete. Thanks for riding with Hitchly!`,
            { tripId: input.tripId, action: "completed", summary }
          ).catch((err) => {
            console.error("Failed to send complete notification:", err);
          });
        }
      }

      return {
        trip: completedTrip,
        summary,
      };
    }),

  submitTripReview: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
      })
    )
    .mutation(async () => {
      // Placeholder only (no DB tables yet)
      return { success: true };
    }),

  submitTripTip: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        tipCents: z.number().int().min(50).max(50000), // $0.50 to $500
      })
    )
    .mutation(async ({ ctx, input }) => {
      const riderId = ctx.userId;

      // Get trip
      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
      }

      if (trip.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only tip for completed trips",
        });
      }

      // Verify rider was on this trip
      const [riderRequest] = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.riderId, riderId),
            eq(tripRequests.status, "completed")
          )
        )
        .limit(1);

      if (!riderRequest) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You were not a rider on this trip",
        });
      }

      // Process the tip
      const result = await processTip(
        input.tripId,
        riderId,
        trip.driverId,
        input.tipCents
      );

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to process tip",
        });
      }

      return { success: true };
    }),

  submitRiderReview: protectedProcedure
    .input(
      z.object({
        tripId: z.string(),
        riderId: z.string(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      const [trip] = await ctx.db
        .select()
        .from(trips)
        .where(eq(trips.id, input.tripId));

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      if (trip.driverId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the driver can rate riders for this trip",
        });
      }

      if (trip.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Trip must be completed before rating riders",
        });
      }

      const [request] = await ctx.db
        .select()
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.riderId, input.riderId)
          )
        );

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rider request not found for this trip",
        });
      }

      // Placeholder: no persistence layer yet for reviews
      fetch(
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "trip.ts:submitRiderReview",
            message: "Driver rated rider (placeholder)",
            data: {
              tripId: input.tripId,
              riderId: input.riderId,
              rating: input.rating,
              hasComment: !!input.comment,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "P",
          }),
        }
      ).catch(() => {});

      return { success: true };
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
        // Fare estimation parameters from matchmaking (for consistent pricing)
        estimatedDistanceKm: z.number().optional(),
        estimatedDurationSec: z.number().optional(),
        estimatedDetourSec: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const riderId = ctx.userId;

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

      // Check if rider has a payment method
      const hasPM = await hasPaymentMethod(riderId);
      if (!hasPM) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You must add a payment method before requesting rides. Go to Profile -> Payment Methods.",
        });
      }

      // Create trip request with pickup coordinates and fare estimation
      const requestId = crypto.randomUUID();
      const [request] = await ctx.db
        .insert(tripRequests)
        .values({
          id: requestId,
          tripId: input.tripId,
          riderId,
          pickupLat: input.pickupLat,
          pickupLng: input.pickupLng,
          // Store fare estimation parameters for consistent pricing
          estimatedDistanceKm: input.estimatedDistanceKm,
          estimatedDurationSec: input.estimatedDurationSec,
          estimatedDetourSec: input.estimatedDetourSec,
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
      const userId = ctx.userId;
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
      let requests;
      try {
        requests = await ctx.db
          .select({
            id: tripRequests.id,
            tripId: tripRequests.tripId,
            riderId: tripRequests.riderId,
            status: tripRequests.status,
            createdAt: tripRequests.createdAt,
            updatedAt: tripRequests.updatedAt,
            riderPickupConfirmedAt: tripRequests.riderPickupConfirmedAt,
            trip: trips,
            rider: users,
          })
          .from(tripRequests)
          .where(and(...conditions))
          .leftJoin(trips, eq(tripRequests.tripId, trips.id))
          .leftJoin(users, eq(tripRequests.riderId, users.id))
          .orderBy(desc(tripRequests.createdAt));
      } catch {
        // Fallback: try without riderPickupConfirmedAt if column doesn't exist
        requests = await ctx.db
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
          .orderBy(desc(tripRequests.createdAt));
      }
      // Filter out requests for cancelled trips, cancelled requests, or trips that don't exist
      const filtered = requests.filter((req) => {
        if (!req.trip) return false;
        if (req.trip.status === "cancelled") return false;
        if (req.status === "cancelled") return false; // Hide cancelled requests from rider's view
        return true;
      });
      return filtered;
    }),

  acceptTripRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const driverId = ctx.userId;

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

      if (!request?.trip) {
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

      let estimatedDistanceKm: number;
      let estimatedDurationSec: number;
      let estimatedDetourSec = 0;

      if (
        request.request.estimatedDistanceKm &&
        request.request.estimatedDurationSec
      ) {
        estimatedDistanceKm = request.request.estimatedDistanceKm;
        estimatedDurationSec = request.request.estimatedDurationSec;
        estimatedDetourSec = request.request.estimatedDetourSec ?? 0;
      } else {
        estimatedDistanceKm = 10; // Default fallback
        estimatedDurationSec = 20 * 60; // 20 minutes fallback

        if (
          request.request.pickupLat &&
          request.request.pickupLng &&
          request.trip.destLat &&
          request.trip.destLng
        ) {
          try {
            const routeResult = await calculateTripDistance(
              {
                lat: request.request.pickupLat,
                lng: request.request.pickupLng,
              },
              { lat: request.trip.destLat, lng: request.trip.destLng }
            );
            if (routeResult) {
              estimatedDistanceKm = routeResult.distanceKm;
              estimatedDurationSec = routeResult.durationSeconds;
            }
          } catch (routeError) {
            console.error(
              "Failed to calculate route distance, using fallback:",
              routeError
            );
          }
        }
      }

      const { totalCents, platformFeeCents, driverAmountCents } = calculateFare(
        estimatedDistanceKm,
        estimatedDurationSec,
        request.trip.bookedSeats,
        estimatedDetourSec
      );

      // Create payment hold BEFORE marking as accepted
      const paymentResult = await createPaymentHold(
        input.requestId,
        request.request.riderId,
        request.trip.driverId,
        totalCents,
        platformFeeCents,
        driverAmountCents
      );

      if (!paymentResult.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Payment failed: ${paymentResult.error}`,
        });
      }

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

      // RETROACTIVE DISCOUNT: Update payment holds for all existing accepted riders
      if (newBookedSeats > 1) {
        const existingAcceptedRequests = await ctx.db
          .select()
          .from(tripRequests)
          .where(
            and(
              eq(tripRequests.tripId, request.trip.id),
              eq(tripRequests.status, "accepted"),
              ne(tripRequests.id, input.requestId)
            )
          );

        for (const existingRequest of existingAcceptedRequests) {
          const existingDistanceKm = existingRequest.estimatedDistanceKm ?? 10;
          const existingDurationSec =
            existingRequest.estimatedDurationSec ?? 1200;
          const existingDetourSec = existingRequest.estimatedDetourSec ?? 0;

          const {
            totalCents: newTotalCents,
            platformFeeCents: newPlatformFee,
            driverAmountCents: newDriverAmount,
          } = calculateFare(
            existingDistanceKm,
            existingDurationSec,
            newBookedSeats - 1,
            existingDetourSec
          );

          const updateResult = await updatePaymentHold(
            existingRequest.id,
            newTotalCents,
            newPlatformFee,
            newDriverAmount
          );

          if (!updateResult.success) {
            console.error(
              `Failed to update payment for request ${existingRequest.id}: ${updateResult.error}`
            );
          }
        }
      }

      return acceptedRequest;
    }),

  rejectTripRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const driverId = ctx.userId;

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

      if (!request?.trip) {
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
      const riderId = ctx.userId;

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

      if (!request?.trip) {
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

      // If request was accepted, decrement booked seats and release payment hold
      if (wasAccepted) {
        await ctx.db
          .update(trips)
          .set({
            bookedSeats: request.trip.bookedSeats - 1,
            updatedAt: new Date(),
          })
          .where(eq(trips.id, request.trip.id));

        // Release payment hold
        cancelPaymentHold(input.requestId).catch((err) => {
          console.error("Failed to cancel payment hold:", err);
        });
      }

      return cancelledRequest;
    }),

  confirmRiderPickup: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const riderId = ctx.userId;

      // Get request
      const [request] = await ctx.db
        .select()
        .from(tripRequests)
        .where(eq(tripRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip request not found",
        });
      }

      // Validate rider owns the request
      if (request.riderId !== riderId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only confirm pickup for your own requests",
        });
      }

      // Validate request status
      if (request.status !== "accepted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request must be accepted before confirming pickup",
        });
      }

      // Update request with pickup confirmation timestamp
      const [updatedRequest] = await ctx.db
        .update(tripRequests)
        .set({
          riderPickupConfirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tripRequests.id, input.requestId))
        .returning();

      return updatedRequest;
    }),

  getAvailableTrips: protectedProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const riderId = ctx.userId;

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
      const driverId = ctx.userId;

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
        }
      }

      return {
        success: true,
        fixedCount: fixedTrips.length,
        fixedTrips,
      };
    }),
});
