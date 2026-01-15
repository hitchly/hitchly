import { router } from "../trpc";
import { healthRouter } from "./health";
import { locationRouter } from "./location";
import { profileRouter } from "./profile";
import { matchmakingRouter } from "./matchmaking";
import { adminRouter } from "./admin";
import { tripRouter } from "./trip";

export const appRouter = router({
  profile: profileRouter,
  location: locationRouter,
  health: healthRouter,
  matchmaking: matchmakingRouter,
  admin: adminRouter,
  trip: tripRouter,
});

export type AppRouter = typeof appRouter;
