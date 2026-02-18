/**
 * This package is a "Type-Only" wrapper for the API.
 * It prevents the Mobile/Admin apps from importing Hono runtime code.
 */
import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../apps/api/trpc/routers";

export type { AppRouter };

/**
 * Inference Helpers
 * These allow you to extract the input/output types of any endpoint
 * Usage: RouterOutputs['route']['subRoute']['procedure']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// You can also export shared Zod schemas here later
// export { tripSchema } from "../../apps/api/src/schemas/trip";
