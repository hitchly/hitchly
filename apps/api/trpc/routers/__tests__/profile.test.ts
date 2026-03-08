// TODO: Fix any linting issues
/* eslint-disable */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../index";

import { createMockContext } from "../../../lib/tests/mockContext";
import { createMockDb } from "../../../lib/tests/mockDb";
import { profileRouter } from "../profile";

const mockDb = vi.hoisted(() => {
  return {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue(true),
      })),
    })),
  };
});

vi.mock("@hitchly/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hitchly/db/client")>();

  return {
    ...actual,
    db: mockDb,
  };
});

describe("Profile Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createCaller = (isAuthenticated = true) => {
    const ctx = {
      req: new Request("http://localhost"),
      resHeaders: new Headers(),
      db: mockDb as any,
      userId: isAuthenticated ? "user-123" : undefined,
    };

    return appRouter.createCaller(ctx);
  };

  describe("getMe", () => {
    it("should return full user profile if found", async () => {
      const caller = createCaller();

      const mockUserRecord = {
        id: "user-123",
        name: "Aidan",
        profile: { bio: "Hello" },
        preferences: { music: true },
        vehicle: null,
      };

      (mockDb.query.users.findFirst as any).mockResolvedValue(mockUserRecord);

      const result = await caller.profile.getMe();

      expect(result).toEqual(mockUserRecord);
      expect(mockDb.query.users.findFirst).toHaveBeenCalled();
    });

    it("should throw NOT_FOUND if user does not exist in DB", async () => {
      const caller = createCaller();

      (mockDb.query.users.findFirst as any).mockResolvedValue(null);

      await expect(caller.profile.getMe()).rejects.toThrowError(
        "User profile not found"
      );
    });
  });

  describe("updateProfile", () => {
    it("should upsert profile data successfully", async () => {
      const caller = createCaller();
      const input = {
        bio: "Engineering Student",
        faculty: "Engineering",
        year: 4,
        appRole: "driver" as const,
        universityRole: "student" as const,
      };

      const result = await caller.profile.updateProfile(input);

      expect(result).toEqual({ success: true });
      expect(mockDb.insert).toHaveBeenCalled();

      const valuesMock = mockDb?.insert?.mock?.results[0]?.value.values;
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          bio: "Engineering Student",
        })
      );
    });
  });

  describe("updateVehicle", () => {
    it("should upsert vehicle data", async () => {
      const caller = createCaller();
      const input = {
        make: "Toyota",
        model: "Camry",
        color: "Blue",
        plate: "ABCD 123",
        seats: 4,
      };

      await caller.profile.updateVehicle(input);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("updatePreferences", () => {
    it("should upsert preferences", async () => {
      const caller = createCaller();
      const input = {
        music: true,
        chatty: false,
        pets: true,
        smoking: false,
      };

      await caller.profile.updatePreferences(input);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});

// ============================================
// Tests using profileRouter directly with createMockDb
// ============================================
describe("Profile Router — Direct", () => {
  let directMockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    directMockDb = createMockDb();
    vi.clearAllMocks();
  });

  // ============================================
  // getDriverEarnings
  // ============================================
  describe("getDriverEarnings", () => {
    it("should return earnings with completed trips (test-ut-profile-5)", async () => {
      const userId = "driver-100";
      const now = new Date();

      // Mock select().from().where() → returns completed trips
      directMockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([
            {
              id: "trip-1",
              driverId: userId,
              status: "completed",
              updatedAt: now,
            },
            {
              id: "trip-2",
              driverId: userId,
              status: "completed",
              updatedAt: now,
            },
          ]),
        }),
      });

      // For each trip, mock the passenger count query
      // Trip 1: 2 completed passengers
      directMockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([
            { id: "req-1", status: "completed" },
            { id: "req-2", status: "completed" },
          ]),
        }),
      });
      // Trip 2: 1 completed passenger
      directMockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValueOnce([{ id: "req-3", status: "completed" }]),
        }),
      });

      const caller = profileRouter.createCaller(
        createMockContext(userId, directMockDb as any)
      );

      const result = await caller.getDriverEarnings();

      // 3 passengers × $7.50 = $22.50 = 2250 cents
      expect(result.totals.lifetimeCents).toBe(2250);
      expect(result.stats.completedTripCount).toBe(2);
      expect(result.stats.avgPerTripCents).toBe(1125); // 2250 / 2
    });

    it("should return zeros when no completed trips (test-ut-profile-6)", async () => {
      const userId = "driver-100";

      directMockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const caller = profileRouter.createCaller(
        createMockContext(userId, directMockDb as any)
      );

      const result = await caller.getDriverEarnings();

      expect(result.totals.lifetimeCents).toBe(0);
      expect(result.totals.weekCents).toBe(0);
      expect(result.totals.monthCents).toBe(0);
      expect(result.stats.completedTripCount).toBe(0);
      expect(result.stats.avgPerTripCents).toBe(0);
    });
  });

  // ============================================
  // updatePushToken
  // ============================================
  describe("updatePushToken", () => {
    it("should update push token successfully (test-ut-profile-7)", async () => {
      const userId = "user-100";

      directMockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const caller = profileRouter.createCaller(
        createMockContext(userId, directMockDb as any)
      );

      const result = await caller.updatePushToken({
        pushToken: "ExponentPushToken[new-token-value]",
      });

      expect(result).toEqual({ success: true });
      expect(directMockDb.update).toHaveBeenCalled();
    });
  });

  // ============================================
  // getBanStatus
  // ============================================
  describe("getBanStatus", () => {
    it("should return not-banned status (test-ut-profile-8)", async () => {
      const userId = "user-100";

      const caller = profileRouter.createCaller(
        createMockContext(userId, directMockDb as any)
      );

      const result = await caller.getBanStatus();

      expect(result).toEqual({ isBanned: false, reason: null });
    });
  });

  // ============================================
  // updateAppRole
  // ============================================
  describe("updateAppRole", () => {
    it("should switch role to rider (test-ut-profile-9)", async () => {
      const userId = "user-100";

      directMockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const caller = profileRouter.createCaller(
        createMockContext(userId, directMockDb as any)
      );

      const result = await caller.updateAppRole({ appRole: "rider" });

      expect(result).toEqual({ success: true });
      expect(directMockDb.insert).toHaveBeenCalled();
    });

    it("should switch role to driver (test-ut-profile-10)", async () => {
      const userId = "user-100";

      directMockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const caller = profileRouter.createCaller(
        createMockContext(userId, directMockDb as any)
      );

      const result = await caller.updateAppRole({ appRole: "driver" });

      expect(result).toEqual({ success: true });
      expect(directMockDb.insert).toHaveBeenCalled();
    });
  });
});
