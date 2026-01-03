import { router } from "../trpc";
import { healthRouter } from "./health";
import { userRouter } from "./user";

export const appRouter = router({
  user: userRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
