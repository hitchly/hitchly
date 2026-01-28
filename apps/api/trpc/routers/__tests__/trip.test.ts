import { beforeEach, describe, expect, it, vi } from "vitest";
import { TIME_WINDOW_MIN, trips } from "@hitchly/db/schema";
import { tripRouter } from "../trip";
import { createMockDb } from "../../../tests/utils/mockDb";
import { createMockContext } from "../../../tests/utils/mockContext";
import {
  createMockTrip,
  createMockTripRequest,
} from "../../../tests/utils/fixtures";

// Mock geocodeAddress
vi.mock("../../services/googlemaps", () => ({
  geocodeAddress: vi.fn().mockResolvedValue({ lat: 43.2609, lng: -79.9192 }),
  calculateTripDistance: vi.fn().mockResolvedValue({ distanceKm: 15.5 }),
}));

// Mock notification service
vi.mock("../../services/notification_service", () => ({
  sendTripNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("Trip Router", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  describe("createTrip", () => {
    const validInput = {
      origin: "McMaster University",
      destination: "Downtown Hamilton",
      departureTime: new Date(Date.now() + TIME_WINDOW_MIN * 60 * 1000 + 1000),
      maxSeats: 3,
    };

    it("should create a trip successfully", async () => {
      const userId = "user123";
      const mockUser = {
        id: userId,
        emailVerified: true,
        name: "Test User",
        email: "test@mcmaster.ca",
      };

      const mockTrip = {
        id: "trip_123",
        driverId: userId,
        ...validInput,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Setup user lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockUser]),
        }),
      });

      // Setup trip insert
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));
      const result = await caller.createTrip(validInput);

      expect(result).toEqual(mockTrip);
      expect(mockDb.insert).toHaveBeenCalledWith(trips);
    });

    it("should reject unverified users", async () => {
      const userId = "user123";
      const mockUser = {
        id: userId,
        emailVerified: false,
        name: "Test User",
        email: "test@mcmaster.ca",
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockUser]),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));

      await expect(caller.createTrip(validInput)).rejects.toThrow(
        "Email must be verified to create trips"
      );
    });

    it("should reject trips with departure time too soon", async () => {
      const userId = "user123";
      const mockUser = {
        id: userId,
        emailVerified: true,
        name: "Test User",
        email: "test@mcmaster.ca",
      };

      const invalidInput = {
        ...validInput,
        departureTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockUser]),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));

      await expect(caller.createTrip(invalidInput)).rejects.toThrow(
        `Departure time must be at least ${TIME_WINDOW_MIN} minutes in the future`
      );
    });

    it("should reject trips with invalid seat count", async () => {
      const userId = "user123";
      const invalidInput = {
        ...validInput,
        maxSeats: 10, // Exceeds MAX_SEATS
      };

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));

      // Zod validation catches this before our custom validation
      await expect(caller.createTrip(invalidInput)).rejects.toThrow();
    });

    it("should require authentication", async () => {
      const caller = tripRouter.createCaller(
        createMockContext(undefined, mockDb)
      );

      await expect(caller.createTrip(validInput)).rejects.toThrow(
        /UNAUTHORIZED|Unauthorized/
      );
    });
  });

  describe("getTrips", () => {
    it("should return all trips when no filters provided", async () => {
      const mockTrips = [
        {
          id: "trip1",
          driverId: "user1",
          origin: "Origin 1",
          destination: "Destination 1",
          departureTime: new Date(),
          maxSeats: 2,
          bookedSeats: 0,
          status: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "trip2",
          driverId: "user2",
          origin: "Origin 2",
          destination: "Destination 2",
          departureTime: new Date(),
          maxSeats: 4,
          bookedSeats: 0,
          status: "active" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockTrips),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext("user123", mockDb)
      );
      const result = await caller.getTrips();

      expect(result).toEqual(mockTrips);
    });

    it("should filter trips by userId", async () => {
      const userId = "user1";
      const mockTrips = [
        {
          id: "trip1",
          driverId: userId,
          origin: "Origin 1",
          destination: "Destination 1",
          departureTime: new Date(),
          maxSeats: 2,
          bookedSeats: 0,
          status: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockTrips),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext("user123", mockDb)
      );
      const result = await caller.getTrips({ userId });

      expect(result).toEqual(mockTrips);
    });
  });

  describe("getTripById", () => {
    it("should return trip with requests", async () => {
      const tripId = "trip123";
      const mockTrip = {
        id: tripId,
        driverId: "user1",
        origin: "Origin",
        destination: "Destination",
        departureTime: new Date(),
        maxSeats: 2,
        bookedSeats: 0,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRequests = [
        {
          id: "request1",
          tripId,
          riderId: "rider1",
          status: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock trip lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      // Mock requests lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(mockRequests),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce(mockRequests),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext("user123", mockDb)
      );
      const result = await caller.getTripById({ tripId });

      expect(result).toMatchObject({
        id: mockTrip.id,
        driverId: mockTrip.driverId,
        origin: mockTrip.origin,
        destination: mockTrip.destination,
        status: mockTrip.status,
        requests: expect.arrayContaining([
          expect.objectContaining({
            id: mockRequests[0].id,
            riderId: mockRequests[0].riderId,
            status: mockRequests[0].status,
          }),
        ]),
      });
    });

    it("should throw error if trip not found", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext("user123", mockDb)
      );

      await expect(
        caller.getTripById({ tripId: "nonexistent" })
      ).rejects.toThrow("Trip not found");
    });
  });

  describe("updateTrip", () => {
    const tripId = "trip123";
    const userId = "user123";
    const mockTrip = {
      id: tripId,
      driverId: userId,
      origin: "Origin",
      destination: "Destination",
      departureTime: new Date(Date.now() + TIME_WINDOW_MIN * 60 * 1000 + 1000),
      availableSeats: 2,
      status: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should update trip successfully", async () => {
      const updates = {
        origin: "New Origin",
        maxSeats: 4,
        bookedSeats: 0,
      };

      // Mock trip lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      const updatedTrip = { ...mockTrip, ...updates };

      // Mock update
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([updatedTrip]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));
      const result = await caller.updateTrip({ tripId, updates });

      expect(result).toEqual(updatedTrip);
    });

    it("should reject update from non-owner", async () => {
      const otherUserId = "otherUser";
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(otherUserId, mockDb)
      );

      await expect(
        caller.updateTrip({ tripId, updates: { origin: "New Origin" } })
      ).rejects.toThrow("Unauthorized: You can only update your own trips");
    });

    it("should reject update of non-pending trips", async () => {
      const completedTrip = { ...mockTrip, status: "completed" as const };
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([completedTrip]),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));

      await expect(
        caller.updateTrip({ tripId, updates: { origin: "New Origin" } })
      ).rejects.toThrow("Can only update pending trips");
    });
  });

  describe("cancelTrip", () => {
    const tripId = "trip123";
    const userId = "user123";
    const mockTrip = {
      id: tripId,
      driverId: userId,
      origin: "Origin",
      destination: "Destination",
      departureTime: new Date(),
      availableSeats: 2,
      status: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should cancel trip successfully", async () => {
      // Mock trip lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      // Mock trip update
      const cancelledTrip = { ...mockTrip, status: "cancelled" as const };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([cancelledTrip]),
          }),
        }),
      });

      // Mock trip requests update
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      // Mock accepted riders query for notifications
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));
      const result = await caller.cancelTrip({ tripId });

      expect(result.success).toBe(true);
      expect(result.trip.status).toBe("cancelled");
    });

    it("should reject cancellation from non-owner", async () => {
      const otherUserId = "otherUser";
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(otherUserId, mockDb)
      );

      await expect(caller.cancelTrip({ tripId })).rejects.toThrow(
        "Unauthorized: You can only cancel your own trips"
      );
    });

    it("should reject cancellation of completed trips", async () => {
      const completedTrip = { ...mockTrip, status: "completed" as const };
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([completedTrip]),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));

      await expect(caller.cancelTrip({ tripId })).rejects.toThrow(
        "Cannot cancel a completed or already cancelled trip"
      );
    });
  });

  describe("startTrip", () => {
    const tripId = "trip123";
    const userId = "user123";
    const mockTrip = createMockTrip({
      id: tripId,
      driverId: userId,
      status: "active",
    });

    it("should start trip successfully", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      const startedTrip = { ...mockTrip, status: "in_progress" as const };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([startedTrip]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));
      const result = await caller.startTrip({ tripId });

      expect(result.status).toBe("in_progress");
    });

    it("should reject start from non-owner", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext("otherUser", mockDb)
      );

      await expect(caller.startTrip({ tripId })).rejects.toThrow(
        "Unauthorized: You can only start your own trips"
      );
    });

    it("should reject start of non-active trips", async () => {
      const pendingTrip = { ...mockTrip, status: "pending" as const };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([pendingTrip]),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));

      await expect(caller.startTrip({ tripId })).rejects.toThrow(
        "Can only start trips that are in active status"
      );
    });
  });

  describe("updatePassengerStatus", () => {
    const tripId = "trip123";
    const requestId = "request123";
    const userId = "user123";
    const mockTrip = createMockTrip({
      id: tripId,
      driverId: userId,
      status: "in_progress",
    });
    const mockRequest = createMockTripRequest({
      id: requestId,
      tripId,
      status: "accepted",
      riderPickupConfirmedAt: new Date(),
    });

    it("should update passenger status to on_trip (pickup)", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockRequest]),
        }),
      });

      const updatedRequest = { ...mockRequest, status: "on_trip" as const };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([updatedRequest]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));
      const result = await caller.updatePassengerStatus({
        tripId,
        requestId,
        action: "pickup",
      });

      expect(result.status).toBe("on_trip");
    });

    it("should update passenger status to completed (dropoff)", async () => {
      const onTripRequest = { ...mockRequest, status: "on_trip" as const };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([onTripRequest]),
        }),
      });

      const updatedRequest = { ...onTripRequest, status: "completed" as const };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([updatedRequest]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));
      const result = await caller.updatePassengerStatus({
        tripId,
        requestId,
        action: "dropoff",
      });

      expect(result.status).toBe("completed");
    });

    it("should reject pickup without rider confirmation", async () => {
      const unconfirmedRequest = {
        ...mockRequest,
        riderPickupConfirmedAt: null,
      };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([unconfirmedRequest]),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));

      await expect(
        caller.updatePassengerStatus({ tripId, requestId, action: "pickup" })
      ).rejects.toThrow("Rider has not confirmed pickup yet");
    });

    it("should reject update when trip is not in_progress", async () => {
      const activeTrip = { ...mockTrip, status: "active" as const };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([activeTrip]),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));

      await expect(
        caller.updatePassengerStatus({ tripId, requestId, action: "pickup" })
      ).rejects.toThrow(
        "Can only update passenger status when trip is in progress"
      );
    });
  });

  describe("completeTrip", () => {
    const tripId = "trip123";
    const userId = "user123";
    const mockTrip = createMockTrip({
      id: tripId,
      driverId: userId,
      status: "in_progress",
      updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    });

    it("should complete trip successfully", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]), // No accepted requests
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]), // No on_trip requests
        }),
      });

      const completedTrip = { ...mockTrip, status: "completed" as const };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([completedTrip]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]), // Completed requests
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));
      const result = await caller.completeTrip({ tripId });

      expect(result.trip.status).toBe("completed");
      expect(result.summary).toHaveProperty("durationMinutes");
      expect(result.summary).toHaveProperty("totalEarningsCents");
      expect(result.summary).toHaveProperty("passengerCount");
    });

    it("should reject completion with incomplete passengers", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi
            .fn()
            .mockResolvedValueOnce([
              createMockTripRequest({ status: "accepted" }),
            ]),
        }),
      });

      const caller = tripRouter.createCaller(createMockContext(userId, mockDb));

      await expect(caller.completeTrip({ tripId })).rejects.toThrow(
        "Cannot complete trip: not all passengers have been dropped off"
      );
    });
  });

  describe("createTripRequest", () => {
    const tripId = "trip123";
    const riderId = "rider123";
    const driverId = "driver123";
    const mockTrip = createMockTrip({
      id: tripId,
      driverId,
      status: "active",
      bookedSeats: 1,
      maxSeats: 3,
    });

    it("should create trip request successfully", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([mockTrip]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]), // No existing request
          }),
        }),
      });

      const mockRequest = createMockTripRequest({
        tripId,
        riderId,
        pickupLat: 43.2609,
        pickupLng: -79.9192,
      });
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([mockRequest]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb)
      );
      const result = await caller.createTripRequest({
        tripId,
        pickupLat: 43.2609,
        pickupLng: -79.9192,
      });

      expect(result.tripId).toBe(tripId);
      expect(result.riderId).toBe(riderId);
    });

    it("should reject request from driver", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([mockTrip]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb)
      );

      await expect(
        caller.createTripRequest({
          tripId,
          pickupLat: 43.2609,
          pickupLng: -79.9192,
        })
      ).rejects.toThrow("You cannot request to join your own trip");
    });

    it("should reject request when no seats available", async () => {
      const fullTrip = { ...mockTrip, bookedSeats: 3, maxSeats: 3 };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([fullTrip]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb)
      );

      await expect(
        caller.createTripRequest({
          tripId,
          pickupLat: 43.2609,
          pickupLng: -79.9192,
        })
      ).rejects.toThrow("This trip has no available seats");
    });
  });

  describe("acceptTripRequest", () => {
    const requestId = "request123";
    const tripId = "trip123";
    const driverId = "driver123";
    const riderId = "rider123";
    const mockTrip = createMockTrip({
      id: tripId,
      driverId,
      status: "pending",
      bookedSeats: 0,
      maxSeats: 3,
    });
    const mockRequest = createMockTripRequest({
      id: requestId,
      tripId,
      riderId,
      status: "pending",
    });

    it("should accept trip request successfully", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            leftJoin: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValueOnce([
                {
                  request: mockRequest,
                  trip: mockTrip,
                },
              ]),
            }),
          }),
        }),
      });

      const acceptedRequest = { ...mockRequest, status: "accepted" as const };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([acceptedRequest]),
          }),
        }),
      });

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb)
      );
      const result = await caller.acceptTripRequest({ requestId });

      expect(result.status).toBe("accepted");
    });

    it("should activate trip when first request accepted", async () => {
      const pendingTrip = { ...mockTrip, status: "pending" as const };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            leftJoin: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValueOnce([
                {
                  request: mockRequest,
                  trip: pendingTrip,
                },
              ]),
            }),
          }),
        }),
      });

      const acceptedRequest = { ...mockRequest, status: "accepted" as const };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([acceptedRequest]),
          }),
        }),
      });

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb)
      );
      await caller.acceptTripRequest({ requestId });

      // Trip should be updated to active
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("getAvailableTrips", () => {
    const riderId = "rider123";
    const driverId = "driver123";

    it("should exclude driver's own trips", async () => {
      const driverTrip = createMockTrip({ driverId, status: "active" });
      const otherTrip = createMockTrip({
        driverId: "other-driver",
        status: "active",
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce([driverTrip, otherTrip]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]), // No existing requests
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb)
      );
      const result = await caller.getAvailableTrips({});

      // Should filter out driver's own trip
      expect(result.every((t) => t.driverId !== riderId)).toBe(true);
    });
  });

  describe("fixTripStatus", () => {
    const driverId = "driver123";
    const tripId = "trip123";
    const mockTrip = createMockTrip({
      id: tripId,
      driverId,
      status: "pending",
    });

    it("should fix stuck trip status", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([{ trip: mockTrip }]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([
            { count: 2 }, // 2 accepted riders
          ]),
        }),
      });

      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb)
      );
      const result = await caller.fixTripStatus({ tripId });

      expect(result.success).toBe(true);
      expect(result.fixedCount).toBe(1);
    });
  });
});
