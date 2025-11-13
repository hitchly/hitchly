import { z } from "zod";
import {
  findAndRankMatches,
  type RiderProfile,
} from "../../services/matchmaking_service";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

// const preferencesSchema = z.object({
//   weightSchedule: z.number().min(0).default(1.0),
//   weightLocation: z.number().min(0).default(1.0),
//   weightCost: z.number().min(0).default(1.0),
//   weightComfort: z.number().min(0).default(1.0),
// });

const riderProfileSchema = z.object({
  id: z.string(),
  origin: locationSchema,
  destination: locationSchema,
  desiredArrivalTime: z.string().regex(/^\d{2}:\d{2}$/),

  maxOccupancy: z.number().int().min(1),
});

export const matchmakingRouter = router({
  findMatches: publicProcedure
    .input(riderProfileSchema)
    .query(async ({ input }) => {
      const rider: RiderProfile = input;

      const matches = await findAndRankMatches(rider);

      console.log(`\n--- Matchmaking Results for Rider ${rider.id} ---`);
      console.table(
        matches.map((m) => ({
          Driver: m.driverId,
          "Total Score": m.totalScore.toFixed(2),
          "Schedule (s)": m.scores.schedule.toFixed(2),
          "Location (s)": m.scores.location.toFixed(2),
          "Cost (s)": m.scores.cost.toFixed(2),
          "Comfort (s)": m.scores.comfort.toFixed(2),
          "Est. Cost": `$${m.details.estimatedCost.toFixed(2)}`,
          "Detour (min)": m.details.detourMinutes.toFixed(1),
        })),
      );
      console.log("----------------------------------------------\n");

      return matches;
    }),
});
