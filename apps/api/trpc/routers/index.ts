import { router } from "../trpc";
import { healthRouter } from "./health";
import { locationRouter } from "./location";
import { profileRouter } from "./profile";

export const appRouter = router({
  profile: profileRouter,
  location: locationRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
