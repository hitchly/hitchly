import { describe, expect, it, vi, type MockInstance } from "vitest";

import { type Context } from "../../../context";
import { safetyRouter } from "../../admin/safety";

// ----------------------------------------------------------------------------
// 1. Mocks (Schema & ORM)
// ----------------------------------------------------------------------------

vi.mock("@hitchly/db/schema", () => ({
  complaints: "complaints_table",
  users: "users_table",
}));

vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => "count_sql"),
  desc: vi.fn(),
  eq: vi.fn(),
}));

// ----------------------------------------------------------------------------
// 2. Strictly Typed Mocks
// ----------------------------------------------------------------------------

interface DrizzleChainMock {
  where: MockInstance<unknown[]>;
  innerJoin: MockInstance<unknown[]>;
  orderBy: MockInstance<unknown[]>;
  limit: MockInstance<unknown[]>;
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

  return {
    select,
    from,
    update,
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

  return safetyRouter.createCaller(ctx);
};

// ----------------------------------------------------------------------------
// 3. The Test Suite
// ----------------------------------------------------------------------------

describe("Safety Router", () => {
  it("calculates safety metrics and categorizes incidents correctly", async () => {
    const db = createMockDb();
    const caller = createCaller(db);
    const now = new Date("2026-02-15T12:00:00Z");

    db.from.mockImplementation((table: string): DrizzleChainMock => {
      if (table === "complaints_table") {
        return {
          where: vi.fn().mockResolvedValue([{ val: 5 }]), // Unresolved KPI
          innerJoin: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([
            {
              id: 1,
              content: "Driver was in an accident! Emergency!",
              status: "pending",
              createdAt: now,
              rideId: "ride-123",
              reporterName: "Aidan",
            },
            {
              id: 2,
              content: "The driver was being very rude.",
              status: "investigating",
              createdAt: now,
              rideId: "ride-456",
              reporterName: "Vehikl",
            },
          ]),
          set: vi.fn().mockReturnThis(),
          then: (resolve) => {
            resolve([{ val: 5 }]);
          },
        };
      }

      return {
        where: vi.fn().mockResolvedValue([]),
        innerJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        set: vi.fn().mockReturnThis(),
        then: (resolve) => {
          resolve([]);
        },
      };
    });

    const result = await caller.metrics();

    // KPI Check
    expect(result.kpis.unresolvedReports).toBe(5);

    // Incident 1 Check (Critical severity check)
    const incident1 = result.incidents[0];
    expect(incident1).toBeDefined();
    if (incident1) {
      expect(incident1.id).toBe("INC-1");
      expect(incident1.severity).toBe("critical");
      expect(incident1.status).toBe("open"); // pending -> open
      expect(incident1.reporter).toBe("Aidan");
      expect(incident1.timestamp).toBe("2026-02-15 12:00");
    }

    // Incident 2 Check (Medium severity check)
    const incident2 = result.incidents[1];
    expect(incident2).toBeDefined();
    if (incident2) {
      expect(incident2.severity).toBe("medium");
      expect(incident2.status).toBe("investigating");
    }
  });

  it("successfully updates complaint status via mutation", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    await caller.updateStatus({ id: 1, status: "resolved" });

    expect(db.update).toHaveBeenCalled();
  });

  it("handles empty complaints list gracefully", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    db.from.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      set: vi.fn().mockReturnThis(),
      then: (resolve: (val: unknown) => void) => {
        resolve([]);
      },
    });

    const result = await caller.metrics();

    expect(result.kpis.unresolvedReports).toBe(0);
    expect(result.incidents).toEqual([]);
  });
});
