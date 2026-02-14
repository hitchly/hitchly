import type { AppRouter } from "@hitchly/api-types";
import { createTRPCReact } from "@trpc/react-query";

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();
