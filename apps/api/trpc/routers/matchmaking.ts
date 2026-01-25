import { z } from "zod";
import { trips, tripRequests, users } from "@hitchly/db/schema";
import { eq, and } from "@hitchly/db/client";
import { TRPCError } from "@trpc/server";
import {
  findMatchesForUser,
  MAX_CANDIDATES,
  MATCH_THRESHOLD,
  type RiderRequest,
  type RideMatch,
} from "../../services/matchmaking_service";
import { protectedProcedure, router } from "../trpc";

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const rideSearchSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  desiredArrivalTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  desiredDate: z.coerce.date().optional(),
  maxOccupancy: z.number().int().min(1).default(1),
  preference: z.enum(["default", "costPriority", "comfortPriority"]).optional(),
  includeDummyMatches: z.boolean().default(false).optional(),
});

const requestRideSchema = z.object({
  rideId: z.string().min(1, "Ride ID is required"),
  pickupLat: z.number(),
  pickupLng: z.number(),
});

export const matchmakingRouter = router({
  findMatches: protectedProcedure
    .input(rideSearchSchema)
    .query(async ({ ctx, input }) => {
      // #region agent log
      const LOG_ENDPOINT =
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9";
      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "matchmaking.ts:41",
          message: "Backend received input.includeDummyMatches",
          data: {
            includeDummyMatches: input.includeDummyMatches,
            type: typeof input.includeDummyMatches,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "A",
        }),
      }).catch(() => {});
      // #endregion agent log

      // Build the rider request using the authenticated user's ID
      const request: RiderRequest = {
        riderId: ctx.userId!,
        origin: input.origin,
        destination: input.destination,
        desiredArrivalTime: input.desiredArrivalTime,
        desiredDate: input.desiredDate,
        maxOccupancy: input.maxOccupancy,
        preference: input.preference,
        includeDummyMatches: input.includeDummyMatches,
      };

      // #region agent log
      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "matchmaking.ts:52",
          message: "Request object includeDummyMatches value",
          data: {
            includeDummyMatches: request.includeDummyMatches,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "A",
        }),
      }).catch(() => {});
      // #endregion agent log

      // Call the matchmaking service to find and rank matches
      const matches = await findMatchesForUser(request);

      // #region agent log
      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "matchmaking.ts:55",
          message: "Matches returned from service",
          data: {
            matchesCount: matches.length,
            matchRideIds: matches.map((m) => m.rideId),
            dummyMatchesCount: matches.filter((m) =>
              m.rideId.startsWith("dummy-")
            ).length,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "A",
        }),
      }).catch(() => {});
      // #endregion agent log

      // Filter by minimum match threshold (MATCH_THRESHOLD is 0-1, matchPercentage is 0-100)
      const thresholdPercent = MATCH_THRESHOLD * 100;
      const validMatches = matches.filter(
        (m: RideMatch) => m.matchPercentage >= thresholdPercent
      );

      const topMatches = validMatches.slice(0, MAX_CANDIDATES);
      return topMatches;
    }),

  //Returns list of confirmed mutual matches (trip requests the user made that were accepted).
  getMatchResults: protectedProcedure.query(async ({ ctx }) => {
    const acceptedRequests = await ctx.db
      .select({
        requestId: tripRequests.id,
        rideId: tripRequests.tripId,
        status: tripRequests.status,
        createdAt: tripRequests.createdAt,
        driverId: trips.driverId,
        startTime: trips.departureTime,
        originLat: trips.originLat,
        originLng: trips.originLng,
        destLat: trips.destLat,
        destLng: trips.destLng,
      })
      .from(tripRequests)
      .innerJoin(trips, eq(tripRequests.tripId, trips.id))
      .where(
        and(
          eq(tripRequests.riderId, ctx.userId!),
          eq(tripRequests.status, "accepted")
        )
      );

    if (acceptedRequests.length === 0) {
      return [];
    }

    const results = await Promise.all(
      acceptedRequests.map(async (req) => {
        const driver = await ctx.db.query.users.findFirst({
          where: eq(users.id, req.driverId),
        });
        return {
          ...req,
          driverName: driver?.name || "Unknown Driver",
          driverImage: driver?.image || "",
        };
      })
    );

    return results;
  }),

  requestRide: protectedProcedure
    .input(requestRideSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the trip exists before creating a request
      const trip = await ctx.db.query.trips.findFirst({
        where: eq(trips.id, input.rideId),
      });

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      // Check if trip has available seats
      if (trip.bookedSeats >= trip.maxSeats) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Trip is fully booked",
        });
      }

      // Insert the trip request with pickup location
      const newRequest = await ctx.db
        .insert(tripRequests)
        .values({
          id: crypto.randomUUID(),
          tripId: input.rideId,
          riderId: ctx.userId!,
          pickupLat: input.pickupLat,
          pickupLng: input.pickupLng,
          status: "pending",
        })
        .returning();

      return {
        success: true,
        requestId: newRequest[0].id,
      };
    }),

  // Accept a trip request (driver action) - increments bookedSeats
  acceptRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.query.tripRequests.findFirst({
        where: eq(tripRequests.id, input.requestId),
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found",
        });
      }

      if (request.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request is not pending",
        });
      }

      const trip = await ctx.db.query.trips.findFirst({
        where: eq(trips.id, request.tripId),
      });

      if (!trip) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });
      }

      if (trip.driverId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the driver can accept requests",
        });
      }

      if (trip.bookedSeats >= trip.maxSeats) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Trip is fully booked",
        });
      }

      await ctx.db
        .update(tripRequests)
        .set({ status: "accepted" })
        .where(eq(tripRequests.id, input.requestId));

      // Increment booked seats and update trip status to "active" if this is the first accepted rider
      const newBookedSeats = trip.bookedSeats + 1;
      const shouldActivateTrip = trip.status === "pending";

      await ctx.db
        .update(trips)
        .set({
          bookedSeats: newBookedSeats,
          status: shouldActivateTrip ? "active" : trip.status,
          updatedAt: new Date(),
        })
        .where(eq(trips.id, request.tripId));

      // #region agent log
      const LOG_ENDPOINT =
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9";
      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "matchmaking.ts:acceptRequest",
          message: "Trip request accepted - updating trip status",
          data: {
            tripId: request.tripId,
            requestId: input.requestId,
            oldStatus: trip.status,
            newStatus: shouldActivateTrip ? "active" : trip.status,
            oldBookedSeats: trip.bookedSeats,
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

      return { success: true };
    }),

  // Cancel a trip request - decrements bookedSeats if was accepted
  cancelRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.query.tripRequests.findFirst({
        where: eq(tripRequests.id, input.requestId),
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Request not found",
        });
      }

      if (request.riderId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel your own requests",
        });
      }

      const wasAccepted = request.status === "accepted";

      await ctx.db
        .update(tripRequests)
        .set({ status: "cancelled" })
        .where(eq(tripRequests.id, input.requestId));

      if (wasAccepted) {
        const trip = await ctx.db.query.trips.findFirst({
          where: eq(trips.id, request.tripId),
        });

        if (trip && trip.bookedSeats > 0) {
          await ctx.db
            .update(trips)
            .set({ bookedSeats: trip.bookedSeats - 1 })
            .where(eq(trips.id, request.tripId));
        }
      }

      return { success: true };
    }),
});
