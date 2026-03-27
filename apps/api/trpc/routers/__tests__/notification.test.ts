import type * as DrizzleClient from "@hitchly/db/client";
import { pushTokens } from "@hitchly/db/schema";
import type { MockInstance } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 1. Define explicit interfaces for Drizzle's fluent API
interface UpsertChain {
  onConflictDoUpdate: MockInstance<[], Promise<void>>;
}

interface ValuesChain {
  values: MockInstance<[], UpsertChain>;
}

interface DeleteChain {
  where: MockInstance<[], Promise<void>>;
}

// 2. Hoist the mocks
const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  delete: vi.fn(),
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  where: vi.fn(),
}));

// 3. Mock the Database Client
vi.mock("@hitchly/db/client", () => ({
  db: {
    insert: mocks.insert,
    delete: mocks.delete,
  },
  and: vi.fn().mockReturnValue("mocked-and"),
  eq: vi.fn().mockReturnValue("mocked-eq"),
}));

// Import router AFTER mocks
import { notificationsRouter } from "../notifications";

describe("notificationsRouter", () => {
  const mockUserId = "user_123";
  const mockToken = "ExponentPushToken[abc-123]";

  /**
   * Helper to create a strictly typed caller.
   * We satisfy the tRPC context by providing real Request and Headers instances.
   */
  const createCaller = (userId: string) =>
    notificationsRouter.createCaller({
      userId,
      // We cast the empty object to satisfy the type,
      // but the router will actually use the hoisted module-level mock.
      db: {} as typeof DrizzleClient.db,
      req: new Request("https://hitchly.dev"),
      resHeaders: new Headers(),
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncPushToken", () => {
    it("should successfully upsert a push token for the authenticated user", async () => {
      const upsertChain: UpsertChain = {
        onConflictDoUpdate:
          mocks.onConflictDoUpdate.mockResolvedValue(undefined),
      };
      const valuesChain: ValuesChain = {
        values: mocks.values.mockReturnValue(upsertChain),
      };
      mocks.insert.mockReturnValue(valuesChain);

      const caller = createCaller(mockUserId);

      const result = await caller.syncPushToken({
        token: mockToken,
      });

      expect(result).toEqual({ success: true });
      expect(mocks.insert).toHaveBeenCalledWith(pushTokens);
      expect(mocks.values).toHaveBeenCalledWith(
        expect.objectContaining({
          token: mockToken,
          userId: mockUserId,
        })
      );
      expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: pushTokens.token,
        })
      );
    });
  });

  describe("removePushToken", () => {
    it("should successfully delete a specific token belonging to the user", async () => {
      const deleteChain: DeleteChain = {
        where: mocks.where.mockResolvedValue(undefined),
      };
      mocks.delete.mockReturnValue(deleteChain);

      const caller = createCaller(mockUserId);

      const result = await caller.removePushToken({
        token: mockToken,
      });

      expect(result).toEqual({ success: true });
      expect(mocks.delete).toHaveBeenCalledWith(pushTokens);
      expect(mocks.where).toHaveBeenCalledTimes(1);
    });
  });
});
