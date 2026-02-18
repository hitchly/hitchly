import { describe, expect, it, vi, type MockInstance } from "vitest";

import { type Context } from "../../../context";
import { financesRouter } from "../../admin/finances";

// ----------------------------------------------------------------------------
// 1. Mocks (Schema & ORM)
// ----------------------------------------------------------------------------

vi.mock("@hitchly/db/schema", () => ({
  payments: "payments_table",
  stripeConnectAccounts: "stripe_connect_table",
  users: "users_table",
}));

vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => "count_sql"),
  eq: vi.fn(),
}));

// ----------------------------------------------------------------------------
// 2. Strictly Typed Mocks
// ----------------------------------------------------------------------------

interface DrizzleChainMock {
  where: MockInstance<unknown[]>;
  innerJoin: MockInstance<unknown[]>;
  limit: MockInstance<unknown[]>;
  then: (resolve: (val: unknown) => void) => void;
}

const createMockDb = () => {
  const from = vi.fn();
  const select = vi.fn().mockReturnValue({ from });

  return {
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

  return financesRouter.createCaller(ctx);
};

// ----------------------------------------------------------------------------
// 3. The Test Suite
// ----------------------------------------------------------------------------

describe("Finances Router", () => {
  it("calculates KPIs and aggregates payout data correctly", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    db.from.mockImplementation((table: string): DrizzleChainMock => {
      if (table === "payments_table") {
        const paymentData = [
          { amountCents: 10000, platformFeeCents: 1500, status: "captured" },
          { amountCents: 5000, platformFeeCents: 750, status: "authorized" },
        ];

        return {
          where: vi.fn().mockResolvedValue([paymentData[1]]),
          innerJoin: vi.fn(),
          limit: vi.fn(),
          then: (resolve) => {
            resolve(paymentData);
          },
        };
      }

      if (table === "stripe_connect_table") {
        return {
          where: vi.fn().mockResolvedValue([{ val: 42 }]),
          innerJoin: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([
            {
              id: "conn_1",
              stripeId: "acct_123",
              onboarding: true,
              userName: "Aidan",
            },
            {
              id: "conn_2",
              stripeId: "acct_456",
              onboarding: false,
              userName: "Vehikl",
            },
          ]),
          then: (resolve) => {
            resolve([{ val: 42 }]);
          },
        };
      }

      return {
        where: vi.fn().mockResolvedValue([]),
        innerJoin: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        then: (resolve) => {
          resolve([]);
        },
      };
    });

    const result = await caller.metrics();

    // KPI Assertions
    expect(result.kpis.grossVolume).toBe(150);
    expect(result.kpis.netRevenue).toBe(22.5);
    expect(result.kpis.payoutsPending).toBe(50);
    expect(result.kpis.activeConnect).toBe(42);

    // Chart Check
    expect(result.revenueChart).toHaveLength(6);
    const firstChartItem = result.revenueChart[0];
    if (firstChartItem) {
      expect(firstChartItem.month).toBe("Sep");
    }

    // Payouts Logic Check
    expect(result.payouts).toHaveLength(2);

    const payout1 = result.payouts[0];
    const payout2 = result.payouts[1];

    if (payout1 && payout2) {
      expect(payout1.driver).toBe("Aidan");
      expect(payout1.status).toBe("paid");
      expect(payout1.stripeId).toBe("acct_123");
      expect(payout2.driver).toBe("Vehikl");
      expect(payout2.status).toBe("action-required");
    }
  });

  it("handles a zero-revenue state gracefully", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    db.from.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      then: (resolve: (val: unknown) => void) => {
        resolve([]);
      },
    });

    const result = await caller.metrics();

    expect(result.kpis.grossVolume).toBe(0);
    expect(result.kpis.netRevenue).toBe(0);
    expect(result.payouts).toEqual([]);
  });
});
