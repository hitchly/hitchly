import { router } from "../../trpc";

import { financesRouter } from "./finances";
import { infrastructureRouter } from "./infrastructure";
import { operationsRouter } from "./operations";
import { safetyRouter } from "./safety";
import { usersRouter } from "./users";

export const adminRouter = router({
  infra: infrastructureRouter,
  ops: operationsRouter,
  users: usersRouter,
  safety: safetyRouter,
  finances: financesRouter,
});
