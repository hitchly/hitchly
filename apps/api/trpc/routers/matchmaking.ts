import { z } from "zod";
import { rideRequests } from "@hitchly/db/schema"; // Access the database
import {
  findAndRankMatches,
  type RiderProfile,
} from "../../services/matchmaking_service";
import { publicProcedure, router } from "../trpc";

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const riderProfileSchema = z.object({
  id: z.string(),
  city: z.string(),
  origin: locationSchema,
  destination: locationSchema,
  desiredArrivalTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxOccupancy: z.number().int().min(1),
  preference: z.enum(["default", "costPriority", "comfortPriority"]).optional(),
});

// Input for the Booking Mutation
const requestRideSchema = z.object({
  rideId: z.string(),
  riderId: z.string(),
  seatsRequested: z.number().min(1).default(1),
});

export const matchmakingRouter = router({
  // 1. The Query (Finding Matches)
  findMatches: publicProcedure
    .input(riderProfileSchema)
    .query(async ({ input }) => {
      const rider: RiderProfile = input;
      const matches = await findAndRankMatches(rider);

      // Filter & Limit for UI
      const validMatches = matches.filter((m) => m.matchPercentage > 40);
      const topMatches = validMatches.slice(0, 20);

      // Add UI helper labels
      return topMatches.map((m) => ({
        ...m,
        uiLabel:
          m.matchPercentage >= 85
            ? "Great Match"
            : m.matchPercentage >= 70
              ? "Good Match"
              : "Fair Match",
      }));
    }),

  // 2. The Mutation (Booking a Ride)
  requestRide: publicProcedure
    .input(requestRideSchema)
    .mutation(async ({ ctx, input }) => {
      // In a real app, you would verify if the ride exists and has seats here.
      // For now, we insert the request directly.

      const newRequest = await ctx.db
        .insert(rideRequests)
        .values({
          id: `req_${Date.now()}`, // Simple ID generation
          rideId: input.rideId,
          riderId: input.riderId,
          seatsRequested: input.seatsRequested,
          status: "pending",
        })
        .returning();
      return { success: true, requestId: newRequest[0].id };
    }),
});
