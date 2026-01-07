import { router } from "../trpc";
import { healthRouter } from "./health";
import { locationRouter } from "./location";
import { profileRouter } from "./profile";
import { userRouter } from "./user";

export const appRouter = router({
  user: userRouter,
  profile: profileRouter,
  location: locationRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
