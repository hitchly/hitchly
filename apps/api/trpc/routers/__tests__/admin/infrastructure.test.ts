import type { MockInstance } from "vitest";
import { describe, expect, it, vi } from "vitest";

import type { Context } from "../../../context";
import { infrastructureRouter } from "../../admin/infrastructure";

// ----------------------------------------------------------------------------
// 1. Mocks (Schema & ORM) - Added pushTokens
// ----------------------------------------------------------------------------

vi.mock("@hitchly/db/schema", () => ({
  users: "users_table",
  routes: "routes_table",
  tripRequests: "trip_requests_table",
  verifications: "verifications_table",
  pushTokens: "push_tokens_table", // Added this missing export
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

interface DrizzleChain {
  where: MockInstance<[unknown], Promise<unknown[]>>;
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

    db.query.users.findFirst.mockResolvedValue({ id: "user-123" });

    db.from.mockImplementation((table: string): DrizzleChain => {
      const defaultResult = [{ value: 0 }];
      const where = vi.fn().mockResolvedValue(defaultResult);

      // Handle the .from().then() pattern for queries without .where()
      const then = (resolve: (val: unknown) => void) => {
        if (table === "routes_table") {
          resolve([{ value: 50 }]);
        } else if (table === "push_tokens_table") {
          resolve([{ value: 150 }]);
        } else {
          resolve(defaultResult);
        }
      };

      if (table === "trip_requests_table") {
        where.mockResolvedValue([{ value: 2000 }]);
      }

      return { where, then };
    });

    const now = new Date();
    db.query.verifications.findMany.mockResolvedValue([
      { identifier: "user@mcmaster.ca", createdAt: now },
    ]);

    const result = await caller.metrics();

    expect(result.kpis.latency).toBeDefined();
    expect(result.kpis.mobileInstalls).toBe(150);
    expect(result.kpis.cacheCount).toBe(50);
    expect(result.quota.directions).toBe(2000);
    expect(result.quota.geocoding).toBe(4000);

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
