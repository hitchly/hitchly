import { router } from "../trpc";
import { healthRouter } from "./health";
import { profileRouter } from "./profile";
import { userRouter } from "./user";

export const appRouter = router({
  user: userRouter,
  profile: profileRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
