import { router } from "../trpc";
import { healthRouter } from "./health";
import { locationRouter } from "./location";
import { profileRouter } from "./profile";
import { adminRouter } from "./admin";

export const appRouter = router({
  profile: profileRouter,
  location: locationRouter,
  health: healthRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
