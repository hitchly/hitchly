import type * as DbClient from "@hitchly/db/client";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

// 1. STUB STRIPE IMMEDIATELY
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({})),
  };
});

// 2. Mock DB Client (Isolated from actual DB)
const mockDb = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn().mockResolvedValue({ success: true });
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    insert,
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
});

vi.mock("@hitchly/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof DbClient>();
  return {
    ...actual,
    db: mockDb,
  };
});

// 3. Imports (After Mocks)
import { type Context } from "../../context";
import { appRouter } from "../index";

describe("Location Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createCaller = (isAuthenticated = true) => {
    const ctx = {
      db: mockDb,
      userId: isAuthenticated ? "user-123" : undefined,
      session: isAuthenticated
        ? {
            user: { id: "user-123", role: "rider" },
            session: { id: "s-1", expiresAt: new Date(), userId: "user-123" },
          }
        : null,
    } as unknown as Context;

    return appRouter.createCaller(ctx);
  };

  describe("saveDefaultAddress", () => {
    it("should save/update the default address for the user", async () => {
      const caller = createCaller();

      const input = {
        address: "1280 Main St W, Hamilton, ON",
        latitude: 43.2609,
        longitude: -79.9192,
      };

      const result = await caller.location.saveDefaultAddress(input);

      expect(result).toEqual({ success: true });

      expect(mockDb.insert).toHaveBeenCalled();

      const insertMock = vi.mocked(mockDb.insert);
      const insertResult = insertMock.mock.results[0]?.value as {
        values: MockInstance;
      };
      const valuesMock = insertResult.values;

      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          defaultAddress: input.address,
          defaultLat: input.latitude,
          defaultLong: input.longitude,
        })
      );
    });

    it("should throw validation error if coordinates are missing", async () => {
      const caller = createCaller();
      const invalidInput = { address: "Nowhere" };

      await expect(
        caller.location.saveDefaultAddress(
          invalidInput as unknown as {
            address: string;
            latitude: number;
            longitude: number;
          }
        )
      ).rejects.toThrow();

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

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
    });

    it("should accept updates without optional fields", async () => {
      const caller = createCaller();
      const input = { latitude: 43.26, longitude: -79.91 };

      const result = await caller.location.update(input);
      expect(result).toEqual({ success: true });
    });
  });
});
