import { z } from "zod";
import { rides, rideRequests, users } from "@hitchly/db/schema";
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

      // Call the matchmaking service to find and rank matches
      const matches = await findMatchesForUser(request);

      // Filter by minimum match threshold (MATCH_THRESHOLD is 0-1, matchPercentage is 0-100)
      const thresholdPercent = MATCH_THRESHOLD * 100;
      const validMatches = matches.filter(
        (m: RideMatch) => m.matchPercentage >= thresholdPercent
      );

      const topMatches = validMatches.slice(0, MAX_CANDIDATES);
      return topMatches;
    }),

  //Returns list of confirmed mutual matches (ride requests the user made that were accepted).
  getMatchResults: protectedProcedure.query(async ({ ctx }) => {
    const acceptedRequests = await ctx.db
      .select({
        requestId: rideRequests.id,
        rideId: rideRequests.rideId,

        status: rideRequests.status,
        createdAt: rideRequests.createdAt,
        driverId: rides.driverId,
        startTime: rides.startTime,
        originLat: rides.originLat,
        originLng: rides.originLng,
        destLat: rides.destLat,
        destLng: rides.destLng,
      })
      .from(rideRequests)
      .innerJoin(rides, eq(rideRequests.rideId, rides.id))
      .where(
        and(
          eq(rideRequests.riderId, ctx.userId!),
          eq(rideRequests.status, "accepted")
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
      // Verify the ride exists before creating a request
      const ride = await ctx.db.query.rides.findFirst({
        where: eq(rides.id, input.rideId),
      });

      if (!ride) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ride not found",
        });
      }

      // Check if ride has available seats
      if (ride.bookedSeats >= ride.maxSeats) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ride is fully booked",
        });
      }

      // Insert the ride request with pickup location
      const newRequest = await ctx.db
        .insert(rideRequests)
        .values({
          id: crypto.randomUUID(),
          rideId: input.rideId,
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

  // Accept a ride request (driver action) - increments bookedSeats
  acceptRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.query.rideRequests.findFirst({
        where: eq(rideRequests.id, input.requestId),
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

      const ride = await ctx.db.query.rides.findFirst({
        where: eq(rides.id, request.rideId),
      });

      if (!ride) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ride not found" });
      }

      if (ride.driverId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the driver can accept requests",
        });
      }

      if (ride.bookedSeats >= ride.maxSeats) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ride is fully booked",
        });
      }

      await ctx.db
        .update(rideRequests)
        .set({ status: "accepted" })
        .where(eq(rideRequests.id, input.requestId));

      await ctx.db
        .update(rides)
        .set({ bookedSeats: ride.bookedSeats + 1 })
        .where(eq(rides.id, request.rideId));

      return { success: true };
    }),

  // Cancel a ride request - decrements bookedSeats if was accepted
  cancelRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.db.query.rideRequests.findFirst({
        where: eq(rideRequests.id, input.requestId),
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
        .update(rideRequests)
        .set({ status: "cancelled" })
        .where(eq(rideRequests.id, input.requestId));

      if (wasAccepted) {
        const ride = await ctx.db.query.rides.findFirst({
          where: eq(rides.id, request.rideId),
        });

        if (ride && ride.bookedSeats > 0) {
          await ctx.db
            .update(rides)
            .set({ bookedSeats: ride.bookedSeats - 1 })
            .where(eq(rides.id, request.rideId));
        }
      }

      return { success: true };
    }),
});
