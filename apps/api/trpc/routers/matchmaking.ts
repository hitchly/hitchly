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
  city: z.string(),
  origin: locationSchema,
  destination: locationSchema,
  desiredArrivalTime: z.string().regex(/^\d{2}:\d{2}$/),

  maxOccupancy: z.number().int().min(1),
  preference: z.enum(["default", "costPriority", "comfortPriority"]).optional(),
});

export const matchmakingRouter = router({
  findMatches: publicProcedure
    .input(riderProfileSchema)
    .query(async ({ input }) => {
      const rider: RiderProfile = input;

      const matches = await findAndRankMatches(rider);

      console.log(
        `\n--- Matchmaking Results for Rider ${rider.id} (${rider.city}) ---`,
      );
      console.table(
        matches.map((m) => ({
          Driver: m.driverId,
          // If you added the city field, keep it short:
          Location: m.driver.city,
          Score: m.totalScore.toFixed(2), // Was "Total Score"
          Sched: m.scores.schedule.toFixed(2), // Was "Schedule (s)"
          Loc: m.scores.location.toFixed(2), // Was "Location (s)"
          Cost: m.scores.cost.toFixed(2), // Was "Cost (s)"
          Comf: m.scores.comfort.toFixed(2), // Was "Comfort (s)"
          $$: `$${m.details.estimatedCost.toFixed(2)}`, // Rounded to whole dollar to save space
          Detour: `${m.details.detourMinutes.toFixed(0)}m`, // Shortened header & value
        })),
      );
      console.log("----------------------------------------------\n");

      return matches;
    }),
});
