import { describe, expect, it, vi, type MockInstance } from "vitest";

import { type Context } from "../../../context";
import { usersRouter } from "../../admin/users";

// ----------------------------------------------------------------------------
// 1. Mocks (Schema & ORM)
// ----------------------------------------------------------------------------

vi.mock("@hitchly/db/schema", () => ({
  users: "users_table",
  stripeConnectAccounts: "stripe_connect_table",
  trips: "trips_table",
  reviews: "reviews_table",
}));

vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => "count_sql"),
  desc: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
}));

// ----------------------------------------------------------------------------
// 2. Strictly Typed Mocks
// ----------------------------------------------------------------------------

interface DrizzleChainMock {
  where: MockInstance<unknown[]>;
  set: MockInstance<unknown[]>;
  then: (resolve: (val: unknown) => void) => void;
}

const createMockDb = () => {
  const from = vi.fn();
  const select = vi.fn().mockReturnValue({ from });
  const update = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue({ success: true }),
  });

  const findMany = vi.fn();

  return {
    select,
    from,
    update,
    query: {
      users: { findMany },
    },
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

  return usersRouter.createCaller(ctx);
};

// ----------------------------------------------------------------------------
// 3. The Test Suite
// ----------------------------------------------------------------------------

describe("Users Router", () => {
  it("calculates user KPIs and enriches user data correctly", async () => {
    const db = createMockDb();
    const caller = createCaller(db);
    const joinedDate = new Date("2026-01-01T12:00:00Z");

    // 1. Mock the findMany call for recent users
    db.query.users.findMany.mockResolvedValue([
      {
        id: "u-1",
        name: "Aidan",
        email: "aidan@mac.ca",
        banned: false,
        emailVerified: true,
        createdAt: joinedDate,
      },
      {
        id: "u-2",
        name: "Guest",
        email: "guest@test.com",
        banned: true,
        emailVerified: false,
        createdAt: joinedDate,
      },
    ]);

    // 2. Mock table-specific select chains
    db.from.mockImplementation((table: string): DrizzleChainMock => {
      const baseChain = {
        where: vi.fn().mockResolvedValue([]),
        set: vi.fn().mockReturnThis(),
        then: (resolve: (val: unknown) => void) => {
          resolve([]);
        },
      };

      if (table === "users_table") {
        // totalRes, bannedRes, pendingRes
        baseChain.where.mockResolvedValue([{ val: 100 }]); // Default for counts
        baseChain.then = (resolve) => {
          resolve([{ val: 100 }]);
        };
      } else if (table === "stripe_connect_table") {
        // driverRes
        baseChain.where.mockResolvedValue([{ val: 15 }]);
      } else if (table === "trips_table") {
        // tripsCountRes inside map
        baseChain.where.mockResolvedValue([{ val: 5 }]);
      } else if (table === "reviews_table") {
        // userReviews inside map
        baseChain.where.mockResolvedValue([{ rating: 5 }, { rating: 4 }]);
      }

      return baseChain;
    });

    const result = await caller.metrics();

    // KPI Assertions
    expect(result.kpis.total).toBe(100);
    expect(result.kpis.drivers).toBe(15);
    expect(result.kpis.banned).toBe(100); // Based on our simple mock logic

    // Enriched User Assertions
    expect(result.users).toHaveLength(2);

    const user1 = result.users[0];
    expect(user1).toBeDefined();
    if (user1) {
      expect(user1.name).toBe("Aidan");
      expect(user1.status).toBe("verified");
      expect(user1.rating).toBe(4.5); // (5+4)/2
      expect(user1.tripsCompleted).toBe(5);
      expect(user1.joinedDate).toBe("2026-01-01");
    }

    const user2 = result.users[1];
    expect(user2).toBeDefined();
    if (user2) {
      expect(user2.status).toBe("banned");
    }
  });

  it("successfully updates user status via mutations", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    await caller.verify({ userId: "u-1" });
    expect(db.update).toHaveBeenCalled();

    await caller.toggleBan({ userId: "u-1", shouldBan: true });
    expect(db.update).toHaveBeenCalledTimes(2);
  });

  it("handles empty user lists gracefully", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    db.query.users.findMany.mockResolvedValue([]);
    db.from.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
      set: vi.fn().mockReturnThis(),
      then: (resolve: (val: unknown) => void) => {
        resolve([]);
      },
    });

    const result = await caller.metrics();

    expect(result.kpis.total).toBe(0);
    expect(result.users).toEqual([]);
  });
});
