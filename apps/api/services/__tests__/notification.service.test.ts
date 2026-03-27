import type * as DrizzleOrm from "drizzle-orm";
import type { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationService } from "../notification.service";

// 1. Hoist mocks. We use a flat object to avoid complex nesting.
const mocks = vi.hoisted(() => {
  const deleteWhere = vi.fn();
  return {
    findMany: vi.fn(),
    deleteWhere,
    delete: vi.fn().mockReturnValue({ where: deleteWhere }),
    isExpoPushToken: vi.fn(),
    chunkPushNotifications: vi.fn(),
    sendPushNotificationsAsync: vi.fn(),
  };
});

// 2. Mock Drizzle client
vi.mock("@hitchly/db/client", () => ({
  db: {
    query: {
      pushTokens: { findMany: mocks.findMany },
    },
    delete: mocks.delete,
  },
}));

// 3. Mock Drizzle ORM utilities without using dynamic import() in the mock factory
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof DrizzleOrm>("drizzle-orm");
  return {
    ...actual,
    inArray: vi.fn().mockReturnValue("mocked-inArray"),
    eq: vi.fn().mockReturnValue("mocked-eq"),
  };
});

// 4. Mock Expo SDK
vi.mock("expo-server-sdk", () => {
  class MockExpo {
    static isExpoPushToken = mocks.isExpoPushToken;
    chunkPushNotifications = mocks.chunkPushNotifications;
    sendPushNotificationsAsync = mocks.sendPushNotificationsAsync;
  }
  return { Expo: MockExpo };
});

describe("NotificationService", () => {
  // Use explicit types for console spies to avoid 'not assignable' errors
  let consoleWarnSpy: MockInstance;
  let consoleErrorSpy: MockInstance;
  let consoleLogSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Use empty arrow functions to satisfy the linter and the variadic nature of console
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      /* noop */
    });
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      /* noop */
    });
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {
      /* noop */
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe("sendToUser", () => {
    it("should exit if user has no tokens", async () => {
      mocks.findMany.mockResolvedValueOnce([]);

      await NotificationService.sendToUser({
        userId: "user-1",
        title: "Test",
        body: "Body",
      });

      expect(mocks.findMany).toHaveBeenCalled();
      expect(mocks.chunkPushNotifications).not.toHaveBeenCalled();
    });

    it("should filter invalid tokens", async () => {
      mocks.findMany.mockResolvedValueOnce([
        { token: "ExponentPushToken[valid]" },
        { token: "invalid" },
      ]);

      mocks.isExpoPushToken.mockImplementation(
        (t: string) => t === "ExponentPushToken[valid]"
      );

      mocks.chunkPushNotifications.mockReturnValueOnce([
        [{ to: "ExponentPushToken[valid]" } as ExpoPushMessage],
      ]);

      mocks.sendPushNotificationsAsync.mockResolvedValueOnce([
        { status: "ok" } as ExpoPushTicket,
      ]);

      await NotificationService.sendToUser({
        userId: "user-1",
        title: "Test",
        body: "Body",
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("not a valid")
      );
    });

    it("should handle dead tokens", async () => {
      mocks.findMany.mockResolvedValueOnce([{ token: "dead-token" }]);
      mocks.isExpoPushToken.mockReturnValue(true);
      mocks.chunkPushNotifications.mockReturnValueOnce([
        [{ to: "dead-token" } as ExpoPushMessage],
      ]);

      mocks.sendPushNotificationsAsync.mockResolvedValueOnce([
        {
          status: "error",
          details: { error: "DeviceNotRegistered" },
        } as ExpoPushTicket,
      ]);

      await NotificationService.sendToUser({
        userId: "user-1",
        title: "Test",
        body: "Body",
      });

      expect(mocks.delete).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cleaned up")
      );
    });
  });

  describe("sendToMultipleUsers", () => {
    it("should batch send for multiple IDs", async () => {
      mocks.findMany.mockResolvedValueOnce([{ token: "t1" }, { token: "t2" }]);
      mocks.isExpoPushToken.mockReturnValue(true);
      mocks.chunkPushNotifications.mockReturnValueOnce([
        [{ to: "t1" } as ExpoPushMessage, { to: "t2" } as ExpoPushMessage],
      ]);
      mocks.sendPushNotificationsAsync.mockResolvedValueOnce([
        { status: "ok" } as ExpoPushTicket,
        { status: "ok" } as ExpoPushTicket,
      ]);

      await NotificationService.sendToMultipleUsers({
        userIds: ["u1", "u2"],
        title: "T",
        body: "B",
      });

      expect(mocks.findMany).toHaveBeenCalled();
      expect(mocks.sendPushNotificationsAsync).toHaveBeenCalled();
    });
  });
});
