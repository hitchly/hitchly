import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../trpc/routers/index";

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

      const valuesMock = mockDb.insert.mock.results[0].value.values;
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
