import { createMockDb } from "./mockDb";
/**
 * Creates a mock tRPC context for testing
 */
export const createMockContext = (userId, db) => ({
  req: {},
  resHeaders: new Headers(),
  db: db || createMockDb(),
  userId,
});
