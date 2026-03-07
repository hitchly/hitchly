// TODO: Fix any linting issues
/* eslint-disable */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockContext } from "../../../lib/tests/mockContext";
import { createMockDb } from "../../../lib/tests/mockDb";
import { matchmakingRouter } from "../matchmaking";

// Hoist mock for dynamic import of matchmaking service
const { mockFindMatchesForUser } = vi.hoisted(() => ({
  mockFindMatchesForUser: vi.fn(),
}));

vi.mock("../../../services/matchmaking", () => ({
  findMatchesForUser: mockFindMatchesForUser,
}));

describe("Matchmaking Router", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  // ============================================
  // findMatches
  // ============================================
  describe("findMatches", () => {
    const validInput = {
      origin: { lat: 43.26, lng: -79.92 },
      destination: { lat: 43.25, lng: -79.87 },
      desiredArrivalTime: "09:00",
      maxOccupancy: 1,
      includeDummyMatches: false,
    };

    it("should return matches with real driver ratings (test-ut-match-3)", async () => {
      const userId = "rider-100";
      mockFindMatchesForUser.mockResolvedValueOnce([
        { driverId: "driver-1", tripId: "trip-1", rating: 5.0 },
        { driverId: "driver-2", tripId: "trip-2", rating: 5.0 },
      ]);

      // Mock the rating query: select().from().where().groupBy()
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValueOnce([
              { targetUserId: "driver-1", average: 4.5 },
              { targetUserId: "driver-2", average: 3.8 },
            ]),
          }),
        }),
      });

      const caller = matchmakingRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.findMatches(validInput);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({ driverId: "driver-1", rating: 4.5 })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ driverId: "driver-2", rating: 3.8 })
      );
      expect(mockFindMatchesForUser).toHaveBeenCalledWith(
        expect.objectContaining({ riderId: userId })
      );
    });

    it("should return dummy matches unmodified (test-ut-match-4)", async () => {
      const userId = "rider-100";
      mockFindMatchesForUser.mockResolvedValueOnce([
        {
          driverId: "dummy-1",
          tripId: "trip-d1",
          rating: 4.2,
          driverName: "Demo Driver",
        },
      ]);

      // No real driver IDs → no DB call for ratings expected
      const caller = matchmakingRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.findMatches(validInput);

      expect(result).toHaveLength(1);
      expect(result[0]?.driverId).toBe("dummy-1");
      // Should remain the original rating from the service, not overridden
      expect(result[0]?.rating).toBe(4.2);
    });

    it("should return empty array when no matches found (test-ut-match-5)", async () => {
      const userId = "rider-100";
      mockFindMatchesForUser.mockResolvedValueOnce([]);

      const caller = matchmakingRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.findMatches(validInput);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // cancelRequest
  // ============================================
  describe("cancelRequest", () => {
    it("should cancel a pending request successfully (test-ut-match-6)", async () => {
      const userId = "rider-100";

      // Mock db.query.tripRequests.findFirst
      (mockDb as any).query = {
        tripRequests: {
          findFirst: vi.fn().mockResolvedValueOnce({
            id: "req-1",
            riderId: userId,
            tripId: "trip-1",
            status: "pending",
          }),
        },
      };

      // Mock update chain
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const caller = matchmakingRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.cancelRequest({ requestId: "req-1" });

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should decrement bookedSeats when cancelling an accepted request (test-ut-match-7)", async () => {
      const userId = "rider-100";

      // Mock db.query.tripRequests.findFirst → accepted request
      (mockDb as any).query = {
        tripRequests: {
          findFirst: vi.fn().mockResolvedValueOnce({
            id: "req-1",
            riderId: userId,
            tripId: "trip-1",
            status: "accepted",
          }),
        },
        trips: {
          findFirst: vi.fn().mockResolvedValueOnce({
            id: "trip-1",
            bookedSeats: 2,
          }),
        },
      };

      // First update: cancel request status
      const updateSetWhere1 = vi.fn().mockResolvedValueOnce(undefined);
      const updateSet1 = vi.fn().mockReturnValue({ where: updateSetWhere1 });
      // Second update: decrement bookedSeats
      const updateSetWhere2 = vi.fn().mockResolvedValueOnce(undefined);
      const updateSet2 = vi.fn().mockReturnValue({ where: updateSetWhere2 });

      mockDb.update
        .mockReturnValueOnce({ set: updateSet1 })
        .mockReturnValueOnce({ set: updateSet2 });

      const caller = matchmakingRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      const result = await caller.cancelRequest({ requestId: "req-1" });

      expect(result).toEqual({ success: true });
      // Two update calls: one for request, one for trip seats
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });

    it("should reject cancellation of another rider's request (test-ut-match-8)", async () => {
      const userId = "rider-100";

      (mockDb as any).query = {
        tripRequests: {
          findFirst: vi.fn().mockResolvedValueOnce({
            id: "req-1",
            riderId: "other-rider",
            tripId: "trip-1",
            status: "pending",
          }),
        },
      };

      const caller = matchmakingRouter.createCaller(
        createMockContext(userId, mockDb as any)
      );

      await expect(
        caller.cancelRequest({ requestId: "req-1" })
      ).rejects.toThrowError("You can only cancel your own requests");
    });
  });
});
