import { router } from "../trpc";
import { userRouter } from "./user";
import { matchmakingRouter } from "./matchmaking";

export const appRouter = router({
  user: userRouter,
  matchmaking: matchmakingRouter,
});

export type AppRouter = typeof appRouter;
