import { describe, expect, it, vi, type MockInstance } from "vitest";

import { type Context } from "../../../context";
import { operationsRouter } from "../../admin/operations";

// ----------------------------------------------------------------------------
// 1. Mocks (Schema & ORM)
// ----------------------------------------------------------------------------

vi.mock("@hitchly/db/schema", () => ({
  trips: "trips_table",
  tripRequests: "trip_requests_table",
  users: "users_table",
}));

vi.mock("drizzle-orm", () => ({
  desc: vi.fn(),
  eq: vi.fn(),
  gt: vi.fn(),
  or: vi.fn(),
}));

// ----------------------------------------------------------------------------
// 2. Strictly Typed Mocks
// ----------------------------------------------------------------------------

interface DrizzleChainMock {
  where: MockInstance<unknown[]>;
  innerJoin: MockInstance<unknown[]>;
  orderBy: MockInstance<unknown[]>;
  limit: MockInstance<unknown[]>;
  then: (resolve: (val: unknown) => void) => void;
}

const createMockDb = () => {
  const from = vi.fn();
  const select = vi.fn().mockReturnValue({ from });

  return {
    query: {
      users: { findFirst: vi.fn() },
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

  return operationsRouter.createCaller(ctx);
};

// ----------------------------------------------------------------------------
// 3. The Test Suite
// ----------------------------------------------------------------------------

describe("Operations Router", () => {
  it("calculates active rides, throughput, and hotspots correctly", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    db.from.mockImplementation((table: string): DrizzleChainMock => {
      if (table === "trips_table") {
        // Full data needed for KPI seat utilization and hotspots
        const fullTripData = [
          {
            id: "t1",
            status: "active",
            maxSeats: 4,
            bookedSeats: 2,
            destination: "McMaster",
            origin: "Burlington",
            departureTime: twoHoursAgo,
            time: twoHoursAgo,
            name: "McMaster",
            createdAt: now,
          },
          {
            id: "t2",
            status: "in_progress",
            maxSeats: 4,
            bookedSeats: 4,
            destination: "McMaster",
            origin: "Hamilton",
            departureTime: now,
            time: now,
            name: "McMaster",
            createdAt: now,
          },
          {
            id: "t3",
            status: "completed",
            maxSeats: 4,
            bookedSeats: 0,
            destination: "Toronto",
            origin: "McMaster",
            departureTime: now,
            time: now,
            name: "Toronto",
            createdAt: now,
          },
        ];

        return {
          // FIX: where() must return full data because it is used for both activeTrips AND throughput
          where: vi.fn().mockResolvedValue(fullTripData.slice(0, 2)),
          innerJoin: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([
            {
              id: "t1",
              origin: "Burl",
              destination: "Mac",
              status: "active",
              createdAt: now,
              driverName: "Aidan",
            },
          ]),
          then: (resolve) => {
            // Satisfies .select().from() calls for KPIs and Hotspots
            resolve(fullTripData);
          },
        };
      }

      if (table === "trip_requests_table") {
        return {
          where: vi.fn(),
          innerJoin: vi.fn(),
          orderBy: vi.fn(),
          limit: vi.fn(),
          then: (resolve) => {
            resolve([{ detour: 600 }, { detour: 1200 }]);
          },
        };
      }

      return {
        where: vi.fn().mockResolvedValue([]),
        innerJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        then: (resolve) => {
          resolve([]);
        },
      };
    });

    const result = await caller.metrics();

    // 1. KPI Assertions
    expect(result.kpis.activeRides).toBe(2);
    expect(result.kpis.avgDetour).toBe(15);
    // (2+4) booked / (4+4) capacity = 75%
    expect(result.kpis.seatUtilization).toBe(75);

    // 2. Throughput Check
    const bucket14 = result.throughput.find((t) => t.time === "14:00");
    expect(bucket14).toBeDefined();
    if (bucket14) {
      expect(bucket14.active).toBe(1);
    }

    // 3. Hotspots Check
    const topHotspot = result.hotspots[0];
    expect(topHotspot).toBeDefined();
    if (topHotspot) {
      expect(topHotspot.name).toBe("McMaster");
      expect(topHotspot.count).toBe(2);
    }
  });

  it("handles zero data gracefully", async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    db.from.mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      then: (resolve: (val: unknown) => void) => {
        resolve([]);
      },
    });

    const result = await caller.metrics();

    expect(result.kpis.activeRides).toBe(0);
    expect(result.kpis.avgDetour).toBe(0);
    expect(result.hotspots).toEqual([]);
  });
});
