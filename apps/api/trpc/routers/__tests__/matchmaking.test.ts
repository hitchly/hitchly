import { beforeEach, describe, expect, it, vi } from "vitest";
import { matchmakingRouter } from "../matchmaking";
import { createMockContext } from "../../../tests/utils/mockContext";

// Mock matchmaking service
vi.mock("../../services/matchmaking_service", () => ({
  findMatchesForUser: vi.fn(),
  MAX_CANDIDATES: 20,
  MATCH_THRESHOLD: 0.3,
}));

// Mock notification service
vi.mock("../../services/notification_service", () => ({
  sendTripNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("Matchmaking Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findMatches", () => {
    const validInput = {
      origin: { lat: 43.2609, lng: -79.9192 },
      destination: { lat: 43.2557, lng: -79.8711 },
      desiredArrivalTime: "14:00",
      maxOccupancy: 1,
    };

    it("should return sorted matches for valid input", async () => {
      const mockMatches = [
        {
          rideId: "trip-1",
          driverId: "driver-1",
          name: "Driver One",
          profilePic: "",
          vehicle: "Toyota Camry",
          rating: 4.5,
          bio: "Test bio",
          matchPercentage: 85,
          uiLabel: "Great Match",
          details: {
            estimatedCost: 10.5,
            detourMinutes: 5,
            arrivalAtPickup: "13:55",
            availableSeats: 2,
          },
        },
        {
          rideId: "trip-2",
          driverId: "driver-2",
          name: "Driver Two",
          profilePic: "",
          vehicle: "Honda Civic",
          rating: 4.0,
          bio: "Test bio 2",
          matchPercentage: 70,
          uiLabel: "Good Match",
          details: {
            estimatedCost: 12.0,
            detourMinutes: 8,
            arrivalAtPickup: "13:52",
            availableSeats: 1,
          },
        },
      ];

      // @ts-expect-error - Module is mocked, TypeScript can't resolve it
      const mockModule = await import("../../services/matchmaking_service");
      const findMatchesForUser = mockModule.findMatchesForUser;
      findMatchesForUser.mockResolvedValue(mockMatches);

      const caller = matchmakingRouter.createCaller(
        createMockContext("rider-123")
      );
      const result = await caller.findMatches(validInput);

      expect(result).toEqual(mockMatches);
      expect(findMatchesForUser).toHaveBeenCalledWith(
        expect.objectContaining({
          riderId: "rider-123",
          origin: validInput.origin,
          destination: validInput.destination,
          desiredArrivalTime: validInput.desiredArrivalTime,
        })
      );
    });

    it("should require authentication", async () => {
      const caller = matchmakingRouter.createCaller(
        createMockContext(undefined)
      );

      await expect(caller.findMatches(validInput)).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("should handle preference presets", async () => {
      // @ts-expect-error - Module is mocked, TypeScript can't resolve it
      const mockModule = await import("../../services/matchmaking_service");
      const findMatchesForUser = mockModule.findMatchesForUser;
      findMatchesForUser.mockResolvedValue([]);

      const caller = matchmakingRouter.createCaller(
        createMockContext("rider-123")
      );

      // Test costPriority
      await caller.findMatches({ ...validInput, preference: "costPriority" });
      expect(findMatchesForUser).toHaveBeenCalledWith(
        expect.objectContaining({ preference: "costPriority" })
      );

      // Test comfortPriority
      await caller.findMatches({
        ...validInput,
        preference: "comfortPriority",
      });
      expect(findMatchesForUser).toHaveBeenCalledWith(
        expect.objectContaining({ preference: "comfortPriority" })
      );
    });

    it("should handle includeDummyMatches flag", async () => {
      // @ts-expect-error - Module is mocked, TypeScript can't resolve it
      const mockModule = await import("../../services/matchmaking_service");
      const findMatchesForUser = mockModule.findMatchesForUser;
      findMatchesForUser.mockResolvedValue([]);

      const caller = matchmakingRouter.createCaller(
        createMockContext("rider-123")
      );

      await caller.findMatches({ ...validInput, includeDummyMatches: true });
      expect(findMatchesForUser).toHaveBeenCalledWith(
        expect.objectContaining({ includeDummyMatches: true })
      );
    });
  });

  // Note: requestRide functionality moved to trip.createTripRequest
  // Tests for requestRide should be in trip.test.ts
});
