import { router } from "../trpc";
import { adminRouter } from "./admin";
import { healthRouter } from "./health";
import { locationRouter } from "./location";
import { profileRouter } from "./profile";
import { matchmakingRouter } from "./matchmaking";
import { tripRouter } from "./trip";
import { paymentRouter } from "./payment";

export const appRouter = router({
  admin: adminRouter,
  profile: profileRouter,
  location: locationRouter,
  health: healthRouter,
  matchmaking: matchmakingRouter,
  trip: tripRouter,
  payment: paymentRouter,
});

export type AppRouter = typeof appRouter;
