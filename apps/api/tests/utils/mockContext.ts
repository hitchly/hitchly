// TODO: Fix linter issues
/* eslint-disable */
import type { Context } from "../../trpc/context";

import { createMockDb } from "./mockDb";

/**
 * Creates a mock tRPC context for testing
 */
export const createMockContext = (userId?: string, db?: any): Context => ({
  req: {} as any,
  resHeaders: new Headers(),
  db: db || createMockDb(),
  userId,
});
