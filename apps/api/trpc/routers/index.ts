import { router } from "../trpc";

import { adminRouter } from "./admin";
import { complaintsRouter } from "./complaints";
import { healthRouter } from "./health";
import { locationRouter } from "./location";
import { matchmakingRouter } from "./matchmaking";
import { paymentRouter } from "./payment";
import { profileRouter } from "./profile";
import { reviewsRouter } from "./reviews";
import { tripRouter } from "./trip";

export const appRouter = router({
  admin: adminRouter,
  complaints: complaintsRouter,
  profile: profileRouter,
  location: locationRouter,
  health: healthRouter,
  matchmaking: matchmakingRouter,
  trip: tripRouter,
  payment: paymentRouter,
  reviews: reviewsRouter,
});

export type AppRouter = typeof appRouter;
