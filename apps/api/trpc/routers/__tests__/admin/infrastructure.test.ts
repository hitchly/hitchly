import { describe, expect, it, vi, type MockInstance } from "vitest";

import type { Context } from "../../../context";
import { infrastructureRouter } from "../../admin/infrastructure";

// ----------------------------------------------------------------------------
// 1. Mocks (Schema & ORM)
// ----------------------------------------------------------------------------

vi.mock("@hitchly/db/schema", () => ({
  users: "users_table",
  routes: "routes_table",
  tripRequests: "trip_requests_table",
  verifications: "verifications_table",
}));

vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => "count_sql"),
  desc: vi.fn(),
  gt: vi.fn(),
  isNotNull: vi.fn(),
}));

// ----------------------------------------------------------------------------
// 2. Strictly Typed Mocks
// ----------------------------------------------------------------------------

interface DrizzleChainMock {
  where: MockInstance<unknown[]>;
  then: (resolve: (val: unknown) => void) => void;
}

const createMockDb = () => {
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const from = vi.fn();
  const select = vi.fn().mockReturnValue({ from });

  return {
    query: {
      users: { findFirst },
      verifications: { findMany },
    },
    select,
    from,
  };
};

const createCaller = (dbMock: ReturnType<typeof createMockDb>) => {
  const ctx = {
    db: dbMock,
    userId: "admin-123",
    session: {
      user: {
        id: "admin-123",
        role: "admin",
        name: "Admin",
        email: "admin@test.com",
      },
      session: {
        id: "session-123",
        expiresAt: new Date(),
        userId: "admin-123",
      },
    },
  } as unknown as Context;

  return infrastructureRouter.createCaller(ctx);
};

// ----------------------------------------------------------------------------
// 3. The Test Suite
// ----------------------------------------------------------------------------

describe("Infrastructure Router", () => {
  it("returns correct system metrics and KPIs", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    // 1. Latency Mock
    db.query.users.findFirst.mockResolvedValue({ id: "user-123" });

    // 2. Chainable Select Mocking
    db.from.mockImplementation((table: string): DrizzleChainMock => {
      const defaultResult = [{ value: 0 }];
      const where = vi.fn().mockResolvedValue(defaultResult);
      const then = (resolve: (val: unknown) => void) => {
        resolve(defaultResult);
      };

      if (table === "users_table") {
        where.mockResolvedValue([{ value: 150 }]);
      } else if (table === "routes_table") {
        return {
          where,
          then: (resolve) => {
            resolve([{ value: 50 }]);
          },
        };
      } else if (table === "trip_requests_table") {
        where.mockResolvedValue([{ value: 2000 }]);
      }

      return { where, then };
    });

    // 3. Logs Mock
    const now = new Date();
    db.query.verifications.findMany.mockResolvedValue([
      { identifier: "user@mcmaster.ca", createdAt: now },
    ]);

    // Execute
    const result = await caller.metrics();

    // Assertions
    expect(result.kpis.latency).toBeDefined();
    expect(result.kpis.mobileInstalls).toBe(150);
    expect(result.kpis.cacheCount).toBe(50);
    expect(result.quota.directions).toBe(2000);
    expect(result.quota.geocoding).toBe(4000);

    // Check if result.logs[0] exists before checking message
    const firstLog = result.logs[0];
    expect(firstLog).toBeDefined();
    if (firstLog) {
      expect(firstLog.message).toBe(
        "Verification processed for user@mcmaster.ca"
      );
    }
  });

  it("handles null/empty database results gracefully", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    db.query.users.findFirst.mockResolvedValue(null);
    db.query.verifications.findMany.mockResolvedValue([]);

    // Fixed the syntax error { {; } here
    db.from.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
      then: (resolve: (val: unknown) => void) => {
        resolve([]);
      },
    });

    const result = await caller.metrics();

    expect(result.kpis.mobileInstalls).toBe(0);
    expect(result.quota.directions).toBe(0);
    expect(result.logs).toEqual([]);
  });
});
