import {
  MAX_SEATS,
  TIME_WINDOW_MIN,
  recurringTripSchedules,
  trips,
} from "@hitchly/db/schema";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { createMockTrip, createMockUser } from "../../../lib/tests/fixtures";
import { createMockContext } from "../../../lib/tests/mockContext";
import { createMockDb } from "../../../lib/tests/mockDb";
import { recurringScheduleRouter } from "../recurringSchedule";

// Hoisted mocks for google maps
const { mockGeocodeAddress } = vi.hoisted(() => ({
  mockGeocodeAddress: vi.fn(),
}));

vi.mock("../../../services/googlemaps", () => ({
  geocodeAddress: mockGeocodeAddress,
}));

interface MockDb {
  select: Mock;
  insert: Mock;
  update: Mock;
}

describe("recurringScheduleRouter", () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = createMockDb() as unknown as MockDb;
    vi.clearAllMocks();
    mockGeocodeAddress.mockReset();
  });

  describe("create", () => {
    const baseInput = {
      origin: "McMaster University",
      destination: "Downtown Hamilton",
      departureTime: new Date(Date.now() + (TIME_WINDOW_MIN + 5) * 60 * 1000),
      maxSeats: 3,
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    };

    it("creates a recurring schedule with geocoded coordinates (test-recurring-1)", async () => {
      const userId = "driver-123";
      const mockUser = createMockUser({ id: userId });

      // 1. User lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockUser]),
        }),
      });

      // 2. Geocode origin/destination
      mockGeocodeAddress
        .mockResolvedValueOnce({ lat: 43.2609, lng: -79.9192 }) // origin
        .mockResolvedValueOnce({ lat: 43.2557, lng: -79.8711 }); // destination

      // 3. Insert schedule
      const mockSchedule = {
        id: "sched-1",
        userId,
        origin: baseInput.origin,
        destination: baseInput.destination,
        maxSeats: baseInput.maxSeats,
        departureMinutes:
          baseInput.departureTime.getHours() * 60 +
          baseInput.departureTime.getMinutes(),
        sunday: false,
        monday: true,
        tuesday: false,
        wednesday: true,
        thursday: false,
        friday: true,
        saturday: false,
        isActive: true,
      };

      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([mockSchedule]),
        }),
      });

      const caller = recurringScheduleRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

      const result = await caller.create(baseInput);

      expect(result).toMatchObject({
        id: "sched-1",
        userId,
        maxSeats: baseInput.maxSeats,
      });
      expect(mockDb.insert).toHaveBeenCalledWith(recurringTripSchedules);
      expect(mockGeocodeAddress).toHaveBeenCalledTimes(2);
    });

    it("enforces TIME_WINDOW_MIN on departureTime (test-recurring-2)", async () => {
      const userId = "driver-123";
      const mockUser = createMockUser({ id: userId });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockUser]),
        }),
      });

      const tooSoon = {
        ...baseInput,
        departureTime: new Date(Date.now() + 5 * 60 * 1000),
      };

      const caller = recurringScheduleRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

      await expect(caller.create(tooSoon)).rejects.toThrow(
        `Departure time must be at least ${TIME_WINDOW_MIN} minutes in the future`
      );
    });

    it("rejects schedules with invalid maxSeats (test-recurring-3)", async () => {
      const userId = "driver-123";
      const mockUser = createMockUser({ id: userId });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockUser]),
        }),
      });

      const invalid = {
        ...baseInput,
        maxSeats: MAX_SEATS + 1,
      };

      const caller = recurringScheduleRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

      await expect(caller.create(invalid)).rejects.toThrow();
    });
  });

  describe("generateUpcomingTripsForUser", () => {
    it("creates trips for enabled weekdays within daysAhead window (test-recurring-4)", async () => {
      const userId = "driver-123";
      const now = new Date();
      const daysAhead = 7;

      // One active schedule, Mon/Wed/Fri at 09:00
      const schedule = {
        id: "sched-1",
        userId,
        origin: "Origin",
        destination: "Destination",
        originLat: 43.26,
        originLng: -79.92,
        destLat: 43.27,
        destLng: -79.91,
        maxSeats: 3,
        effectiveFrom: now,
        effectiveTo: null,
        isActive: true,
        scheduleTimezone: "America/Toronto",
        departureMinutes: 9 * 60,
        sunday: false,
        monday: true,
        tuesday: false,
        wednesday: true,
        thursday: false,
        friday: true,
        saturday: false,
      };

      // Schedules query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([schedule]),
        }),
      });

      // For simplicity, say no existing trips match, and each insert returns a trip id
      // generateUpcomingTripsForUser loops day by day, so we mock select+insert chains
      // using a simple pattern: for every call to select(trips) return empty.
      (mockDb.select as Mock).mockImplementationOnce(() => {
        // First call already configured above; subsequent selects are for existing trips
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        };
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "trip-generated" }]),
        }),
      });

      const caller = recurringScheduleRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

      const result = await caller.generateUpcomingTripsForUser({ daysAhead });

      expect(result.createdCount).toBeGreaterThan(0);
      expect(result.trips[0]?.id).toBeDefined();
    });
  });

  describe("getNextTripOccurrence", () => {
    it("returns the next future trip for a schedule (test-recurring-5)", async () => {
      const userId = "driver-123";
      const recurringScheduleId = "sched-1";
      const after = new Date("2025-04-07T08:00:00Z");

      const nextTrip = createMockTrip({
        id: "trip-next",
        recurringScheduleId,
        departureTime: new Date("2025-04-14T08:00:00Z"),
      });

      (mockDb.select as Mock).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValueOnce([
                {
                  id: nextTrip.id,
                  departureTime: nextTrip.departureTime,
                  origin: nextTrip.origin,
                  destination: nextTrip.destination,
                },
              ]),
            }),
          }),
        }),
      });

      const caller = recurringScheduleRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

      const result = await caller.getNextTripOccurrence({
        recurringScheduleId,
        after,
      });

      expect(result).toMatchObject({
        id: "trip-next",
        origin: nextTrip.origin,
        destination: nextTrip.destination,
      });
    });
  });
});
