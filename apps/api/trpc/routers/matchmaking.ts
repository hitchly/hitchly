import { z } from "zod";
import { trips, tripRequests } from "@hitchly/db/schema";
import { eq } from "@hitchly/db/client";
import { TRPCError } from "@trpc/server";
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

export const matchmakingRouter = router({
  findMatches: protectedProcedure
    .input(rideSearchSchema)
    .query(async ({ ctx, input }) => {
      const { findMatchesForUser } =
        await import("../../services/matchmaking_service");

      const riderId = ctx.userId!;
      const matches = await findMatchesForUser({
        riderId,
        origin: input.origin,
        destination: input.destination,
        desiredArrivalTime: input.desiredArrivalTime,
        desiredDate: input.desiredDate,
        maxOccupancy: input.maxOccupancy,
        preference: input.preference,
        includeDummyMatches: input.includeDummyMatches,
      });

      return matches;
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
