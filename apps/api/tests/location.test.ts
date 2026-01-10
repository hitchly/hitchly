import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../trpc/routers/index";

// 1. Hoist the mock variable so it exists before the mock factory runs
const mockDb = vi.hoisted(() => {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue(true),
      })),
    })),
  };
});

// 2. Mock the DB client, preserving other exports (like schemas/eq)
vi.mock("@hitchly/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hitchly/db/client")>();
  return {
    ...actual,
    db: mockDb,
  };
});

describe("Location Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create a caller with context
  const createCaller = (isAuthenticated = true) => {
    const ctx = {
      req: {} as any,
      res: {} as any,
      db: mockDb as any,
      userId: isAuthenticated ? "user-123" : undefined,
    };

    return appRouter.createCaller(ctx);
  };

  // --- TEST: saveDefaultAddress ---
  describe("saveDefaultAddress", () => {
    it("should save/update the default address for the user", async () => {
      const caller = createCaller();

      const input = {
        address: "1280 Main St W, Hamilton, ON",
        latitude: 43.2609,
        longitude: -79.9192,
      };

      const result = await caller.location.saveDefaultAddress(input);

      // 1. Verify success response
      expect(result).toEqual({ success: true });

      // 2. Verify DB interaction
      expect(mockDb.insert).toHaveBeenCalled();

      // 3. Verify the values passed to the DB
      // We access the chained 'values' mock function
      const valuesMock = mockDb.insert.mock.results[0].value.values;

      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          defaultAddress: input.address,
          defaultLat: input.latitude,
          defaultLong: input.longitude,
          // Ensure defaults are being set as per your router logic
          appRole: "rider",
          universityRole: "student",
        })
      );
    });

    it("should throw validation error if coordinates are missing", async () => {
      const caller = createCaller();

      // Missing lat/long
      const invalidInput = {
        address: "Nowhere",
      };

      await expect(
        caller.location.saveDefaultAddress(invalidInput as any)
      ).rejects.toThrow();

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  // --- TEST: update (Live Tracking) ---
  describe("update", () => {
    it("should accept valid live location updates", async () => {
      const caller = createCaller();

      const input = {
        latitude: 43.26,
        longitude: -79.91,
        heading: 90,
        speed: 15,
      };

      const result = await caller.location.update(input);

      expect(result).toEqual({ success: true });
      // Note: Since your router currently does nothing with this data,
      // we just ensure the endpoint accepts the input successfully.
    });

    it("should accept updates without optional fields", async () => {
      const caller = createCaller();

      const input = {
        latitude: 43.26,
        longitude: -79.91,
        // heading/speed are optional
      };

      const result = await caller.location.update(input);
      expect(result).toEqual({ success: true });
    });
  });
});
