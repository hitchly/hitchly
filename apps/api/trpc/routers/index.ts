import { router } from "../trpc";
import { healthRouter } from "./health";
import { locationRouter } from "./location";
import { profileRouter } from "./profile";
import { matchmakingRouter } from "./matchmaking";

export const appRouter = router({
  profile: profileRouter,
  location: locationRouter,
  health: healthRouter,
  matchmaking: matchmakingRouter,
});

export type AppRouter = typeof appRouter;
