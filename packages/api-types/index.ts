/**
 * This package is a "Type-Only" wrapper for the API.
 * It prevents the Mobile/Admin apps from importing Hono runtime code.
 */
import type { AppRouter } from "../../apps/api/trpc/routers";

export type { AppRouter };

// You can also export shared Zod schemas here later
// export { tripSchema } from "../../apps/api/src/schemas/trip";
