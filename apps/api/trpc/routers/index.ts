import { router } from "../trpc";
import { adminRouter } from "./admin";
import { complaintsRouter } from "./complaints";
import { healthRouter } from "./health";
import { locationRouter } from "./location";
import { profileRouter } from "./profile";
import { matchmakingRouter } from "./matchmaking";
import { tripRouter } from "./trip";

export const appRouter = router({
  admin: adminRouter,
  complaints: complaintsRouter,
  profile: profileRouter,
  location: locationRouter,
  health: healthRouter,
  matchmaking: matchmakingRouter,
  trip: tripRouter,
});

export type AppRouter = typeof appRouter;
