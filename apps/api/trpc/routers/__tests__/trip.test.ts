import { TIME_WINDOW_MIN, trips } from "@hitchly/db/schema";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import {
  createMockTrip,
  createMockTripRequest,
} from "../../../lib/tests/fixtures";
import { createMockContext } from "../../../lib/tests/mockContext";
import { createMockDb } from "../../../lib/tests/mockDb";
import { tripRouter } from "../trip";

// Hoist mocks to be available in factories
const { mockGeocodeAddress, mockCalculateTripDistance } = vi.hoisted(() => {
  return {
    mockGeocodeAddress: vi.fn(),
    mockCalculateTripDistance: vi.fn(),
  };
});

vi.mock("../../../services/googlemaps", () => ({
  geocodeAddress: mockGeocodeAddress,
  calculateTripDistance: mockCalculateTripDistance,
}));

// Mock notification service
vi.mock("../../../services/notification", () => ({
  sendTripNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock payment service
vi.mock("../../../services/payment", () => ({
  hasPaymentMethod: vi.fn().mockResolvedValue(true),
  createPaymentHold: vi
    .fn()
    .mockResolvedValue({ success: true, paymentId: "pay_123" }),
  capturePayment: vi
    .fn()
    .mockResolvedValue({ success: true, paymentId: "pay_123" }),
  cancelPaymentHold: vi.fn().mockResolvedValue({ success: true }),
  updatePaymentHold: vi.fn().mockResolvedValue({ success: true }),
  processTip: vi.fn().mockResolvedValue({ success: true }),
  getStripeCustomerId: vi.fn().mockResolvedValue("cus_123"),
  getOrCreateStripeCustomer: vi
    .fn()
    .mockResolvedValue({ stripeCustomerId: "cus_123", isNew: false }),
  createSetupIntent: vi
    .fn()
    .mockResolvedValue({ clientSecret: "seti_secret_123" }),
  listPaymentMethods: vi
    .fn()
    .mockResolvedValue([{ id: "pm_123", card: { last4: "4242" } }]),
  deletePaymentMethod: vi.fn().mockResolvedValue(undefined),
  setDefaultPaymentMethod: vi.fn().mockResolvedValue(undefined),
  createConnectAccount: vi
    .fn()
    .mockResolvedValue({ accountId: "acct_123", isNew: false }),
  createConnectOnboardingLink: vi
    .fn()
    .mockResolvedValue("https://stripe.com/onboarding"),
  getConnectAccountStatus: vi.fn().mockResolvedValue({
    hasAccount: true,
    accountId: "acct_123",
    onboardingComplete: true,
    payoutsEnabled: true,
  }),
  calculateFare: vi.fn().mockReturnValue({
    totalCents: 1000,
    platformFeeCents: 150,
    driverAmountCents: 850,
  }),
  getPaymentStatus: vi
    .fn()
    .mockResolvedValue({ status: "captured", amountCents: 1000 }),
}));

// Helper type for the mock DB to avoid explicit 'any'
interface MockDb {
  select: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  query: {
    users: { findFirst: Mock };
  };
}

describe("Trip Router", () => {
  let mockDb: MockDb;

  beforeEach(() => {
    // Cast the helper result to our MockDb interface
    mockDb = createMockDb() as unknown as MockDb;

    // Clear call history but keep implementation
    mockGeocodeAddress.mockClear();
    mockCalculateTripDistance.mockClear();

    // Clear other mocks
    vi.clearAllMocks();

    // Setup default mocks - ensure they're always configured
    mockGeocodeAddress.mockResolvedValue({ lat: 43.2609, lng: -79.9192 });
    mockCalculateTripDistance.mockResolvedValue({ distanceKm: 15.5 });
  });

  describe("createTrip", () => {
    const validInput = {
      origin: "McMaster University",
      destination: "Downtown Hamilton",
      departureTime: new Date(Date.now() + TIME_WINDOW_MIN * 60 * 1000 + 1000),
      maxSeats: 3,
    };

    it("should create a trip successfully (test-ut-trip-1)", async () => {
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

      // Setup geocode mocks - return different values for origin and destination
      mockGeocodeAddress
        .mockResolvedValueOnce({ lat: 43.2609, lng: -79.9192 }) // origin
        .mockResolvedValueOnce({ lat: 43.2557, lng: -79.8711 }); // destination

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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );
      const result = await caller.createTrip(validInput);

      expect(result).toEqual(mockTrip);
      expect(mockDb.insert).toHaveBeenCalledWith(trips);
      expect(mockGeocodeAddress).toHaveBeenCalledTimes(2);
    });

    it("should reject unverified users (test-ut-trip-1)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

      await expect(caller.createTrip(validInput)).rejects.toThrow(
        "Email must be verified to create trips"
      );
    });

    it("should reject trips with departure time too soon (test-ut-trip-1)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

      await expect(caller.createTrip(invalidInput)).rejects.toThrow(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Departure time must be at least ${TIME_WINDOW_MIN} minutes in the future`
      );
    });

    it("should reject trips with invalid seat count (test-ut-trip-1)", async () => {
      const userId = "user123";
      const invalidInput = {
        ...validInput,
        maxSeats: 10, // Exceeds MAX_SEATS
      };

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

      // Zod validation catches this before our custom validation
      await expect(caller.createTrip(invalidInput)).rejects.toThrow();
    });

    it("should require authentication (test-ut-trip-1)", async () => {
      const caller = tripRouter.createCaller(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(undefined, mockDb as any)
      );

      await expect(caller.createTrip(validInput)).rejects.toThrow(
        /UNAUTHORIZED|Unauthorized/
      );
    });
  });

  describe("getTrips", () => {
    it("should return all trips when no filters provided (test-ut-trip-2)", async () => {
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

      // 1. Mock Base Trips Lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockTrips),
          }),
        }),
      });

      // 2. Mock getRequests() lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      // 3. Mock getDrivers() lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([
            { id: "user1", name: "Driver 1", email: "user1@test.com" },
            { id: "user2", name: "Driver 2", email: "user2@test.com" },
          ]),
        }),
      });

      const caller = tripRouter.createCaller(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext("user123", mockDb as any)
      );
      const result = await caller.getTrips();

      // Because our function maps .driver and .requests onto the return result
      expect(result).toMatchObject(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        mockTrips.map((t) => expect.objectContaining({ id: t.id }))
      );
    });

    it("should filter trips by userId (test-ut-trip-2)", async () => {
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

      // 1. Mock Base Trips Lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockTrips),
          }),
        }),
      });

      // 2. Mock getRequests() lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      // 3. Mock getDrivers() lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi
            .fn()
            .mockResolvedValueOnce([
              { id: userId, name: "Test Driver", email: "driver@test.com" },
            ]),
        }),
      });

      const caller = tripRouter.createCaller(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext("user123", mockDb as any)
      );
      const result = await caller.getTrips({ userId });

      expect(result[0]?.id).toBe("trip1");
      expect(result[0]?.driver?.id).toBe(userId);
    });
  });

  describe("getTripById", () => {
    it("should return trip with requests (test-ut-trip-2)", async () => {
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

      // 1. Mock trip lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      // 2. Mock requests lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(mockRequests),
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce(mockRequests),
          }),
        }),
      });

      // 3. Mock driver lookup (ADDED FIX)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi
            .fn()
            .mockResolvedValueOnce([
              { id: "user1", name: "Test Driver", email: "driver@test.com" },
            ]),
        }),
      });

      const caller = tripRouter.createCaller(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext("user123", mockDb as any)
      );
      const result = await caller.getTripById({ tripId });

      expect(result).toMatchObject({
        id: mockTrip.id,
        driverId: mockTrip.driverId,
        origin: mockTrip.origin,
        destination: mockTrip.destination,
        status: mockTrip.status,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        requests: expect.arrayContaining([
          expect.objectContaining({
            id: mockRequests[0]?.id,
            riderId: mockRequests[0]?.riderId,
            status: mockRequests[0]?.status,
          }),
        ]),
      });
    });

    it("should throw error if trip not found (test-ut-trip-2)", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const caller = tripRouter.createCaller(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext("user123", mockDb as any)
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

    it("should update trip successfully (test-ut-trip-3)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );
      const result = await caller.updateTrip({ tripId, updates });

      expect(result).toEqual(updatedTrip);
    });

    it("should reject update from non-owner (test-ut-trip-3)", async () => {
      const otherUserId = "otherUser";
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(otherUserId, mockDb as any)
      );

      await expect(
        caller.updateTrip({ tripId, updates: { origin: "New Origin" } })
      ).rejects.toThrow("Unauthorized: You can only update your own trips");
    });

    it("should reject update of non-pending trips (test-ut-trip-3)", async () => {
      const completedTrip = { ...mockTrip, status: "completed" as const };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([completedTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

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

    it("should cancel trip successfully (test-ut-trip-4)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );
      const result = await caller.cancelTrip({ tripId });

      expect(result.success).toBe(true);
      expect(result.trip?.status).toBe("cancelled");
    });

    it("should reject cancellation from non-owner (test-ut-trip-4)", async () => {
      const otherUserId = "otherUser";
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(otherUserId, mockDb as any)
      );

      await expect(caller.cancelTrip({ tripId })).rejects.toThrow(
        "Unauthorized: You can only cancel your own trips"
      );
    });

    it("should reject cancellation of completed trips (test-ut-trip-4)", async () => {
      const completedTrip = { ...mockTrip, status: "completed" as const };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([completedTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

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

    it("should start trip successfully (test-ut-trip-5)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );
      const result = await caller.startTrip({ tripId });

      expect(result.status).toBe("in_progress");
    });

    it("should reject start from non-owner (test-ut-trip-5)", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext("otherUser", mockDb as any)
      );

      await expect(caller.startTrip({ tripId })).rejects.toThrow(
        "Unauthorized: You can only start your own trips"
      );
    });

    it("should reject start of non-active trips (test-ut-trip-5)", async () => {
      const pendingTrip = { ...mockTrip, status: "pending" as const };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([pendingTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

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

    it("should update passenger status to on_trip (pickup) (test-ut-trip-6)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );
      const result = await caller.updatePassengerStatus({
        tripId,
        requestId,
        action: "pickup",
      });

      expect(result?.status).toBe("on_trip");
    });

    it("should update passenger status to completed (dropoff) (test-ut-trip-6)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );
      const result = await caller.updatePassengerStatus({
        tripId,
        requestId,
        action: "dropoff",
      });

      expect(result?.status).toBe("completed");
    });

    it("should reject pickup without rider confirmation (test-ut-trip-6)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

      await expect(
        caller.updatePassengerStatus({ tripId, requestId, action: "pickup" })
      ).rejects.toThrow("Rider has not confirmed pickup yet");
    });

    it("should reject update when trip is not in_progress (test-ut-trip-6)", async () => {
      const activeTrip = { ...mockTrip, status: "active" as const };
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([activeTrip]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

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

    it("should complete trip successfully (test-ut-trip-7)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );
      const result = await caller.completeTrip({ tripId });

      expect(result.trip?.status).toBe("completed");
      expect(result.summary).toHaveProperty("durationMinutes");
      expect(result.summary).toHaveProperty("totalEarningsCents");
      expect(result.summary).toHaveProperty("passengerCount");
    });

    it("should reject completion with incomplete passengers (test-ut-trip-7)", async () => {
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

      const caller = tripRouter.createCaller(
        createMockContext(userId, mockDb as unknown)
      );

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(riderId, mockDb as any)
      );
      const result = await caller.createTripRequest({
        tripId,
        pickupLat: 43.2609,
        pickupLng: -79.9192,
      });

      expect(result?.tripId).toBe(tripId);
      expect(result?.riderId).toBe(riderId);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(driverId, mockDb as any)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(riderId, mockDb as any)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(driverId, mockDb as any)
      );
      const result = await caller.acceptTripRequest({ requestId });

      expect(result?.status).toBe("accepted");
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(driverId, mockDb as any)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(riderId, mockDb as any)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createMockContext(driverId, mockDb as any)
      );
      const result = await caller.fixTripStatus({ tripId });

      expect(result.success).toBe(true);
      expect(result.fixedCount).toBe(1);
    });
  });

  // ============================================
  // PENDING TESTS: Trip Request Edge Cases
  // ============================================

  describe("rejectTripRequest", () => {
    it("should reject a pending trip request (test-ut-trip-12)", async () => {
      const driverId = "driver-123";
      const mockRequest = createMockTripRequest({
        id: "req-1",
        tripId: "trip-1",
        riderId: "rider-1",
        status: "pending",
      });
      const mockTrip = createMockTrip({
        id: "trip-1",
        driverId,
        status: "active",
      });

      // Mock select: get request with trip via leftJoin
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            leftJoin: vi.fn().mockReturnValueOnce({
              limit: vi
                .fn()
                .mockResolvedValueOnce([
                  { request: mockRequest, trip: mockTrip },
                ]),
            }),
          }),
        }),
      });

      // Mock update: set status to rejected
      const rejectedRequest = { ...mockRequest, status: "rejected" };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([rejectedRequest]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );
      const result = await caller.rejectTripRequest({ requestId: "req-1" });

      expect(result?.status).toBe("rejected");
    });

    it("should reject non-owner drivers (test-ut-trip-12)", async () => {
      const nonOwnerDriverId = "other-driver";
      const mockRequest = createMockTripRequest({
        id: "req-1",
        tripId: "trip-1",
        riderId: "rider-1",
        status: "pending",
      });
      const mockTrip = createMockTrip({
        id: "trip-1",
        driverId: "driver-123",
        status: "active",
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            leftJoin: vi.fn().mockReturnValueOnce({
              limit: vi
                .fn()
                .mockResolvedValueOnce([
                  { request: mockRequest, trip: mockTrip },
                ]),
            }),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(nonOwnerDriverId, mockDb as unknown)
      );

      await expect(
        caller.rejectTripRequest({ requestId: "req-1" })
      ).rejects.toThrow(
        /FORBIDDEN|You can only reject requests for your own trips/
      );
    });
  });

  describe("cancelTripRequest", () => {
    it("should cancel an accepted request and release payment hold (test-ut-trip-13)", async () => {
      const riderId = "rider-123";
      const mockRequest = createMockTripRequest({
        id: "req-1",
        tripId: "trip-1",
        riderId,
        status: "accepted",
      });
      const mockTrip = createMockTrip({
        id: "trip-1",
        driverId: "driver-1",
        bookedSeats: 1,
        status: "active",
      });

      // Mock select: get request with trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            leftJoin: vi.fn().mockReturnValueOnce({
              limit: vi
                .fn()
                .mockResolvedValueOnce([
                  { request: mockRequest, trip: mockTrip },
                ]),
            }),
          }),
        }),
      });

      // Mock update: cancel request
      const cancelledRequest = { ...mockRequest, status: "cancelled" };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([cancelledRequest]),
          }),
        }),
      });

      // Mock update: decrement bookedSeats
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const { cancelPaymentHold: mockCancelPaymentHold } =
        await import("../../../services/payment");

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );
      const result = await caller.cancelTripRequest({ requestId: "req-1" });

      expect(result?.status).toBe("cancelled");
      expect(mockCancelPaymentHold).toHaveBeenCalledWith("req-1");
    });
  });

  describe("confirmRiderPickup", () => {
    it("should set riderPickupConfirmedAt for accepted requests (test-ut-trip-14)", async () => {
      const riderId = "rider-123";
      const mockRequest = createMockTripRequest({
        id: "req-1",
        riderId,
        status: "accepted",
      });

      // Mock select: get request
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([mockRequest]),
          }),
        }),
      });

      // Mock update: set riderPickupConfirmedAt
      const updatedRequest = {
        ...mockRequest,
        riderPickupConfirmedAt: new Date(),
      };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([updatedRequest]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );
      const result = await caller.confirmRiderPickup({ requestId: "req-1" });

      expect(result?.riderPickupConfirmedAt).toBeTruthy();
    });

    it("should reject wrong rider (test-ut-trip-14)", async () => {
      const wrongRiderId = "wrong-rider";
      const mockRequest = createMockTripRequest({
        id: "req-1",
        riderId: "rider-123",
        status: "accepted",
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([mockRequest]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(wrongRiderId, mockDb as unknown)
      );

      await expect(
        caller.confirmRiderPickup({ requestId: "req-1" })
      ).rejects.toThrow(
        /FORBIDDEN|You can only confirm pickup for your own requests/
      );
    });
  });

  describe("createTripRequest - no payment method", () => {
    it("should reject riders without a payment method (test-ut-trip-15)", async () => {
      const riderId = "rider-no-pm";
      const mockTrip = createMockTrip({
        id: "trip-1",
        driverId: "driver-1",
        status: "active",
        bookedSeats: 0,
        maxSeats: 3,
      });

      // Mock select: get trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([mockTrip]),
          }),
        }),
      });

      // Mock select: check existing request (none found)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      // Override hasPaymentMethod to return false
      const { hasPaymentMethod: mockHasPaymentMethod } =
        await import("../../../services/payment");
      (mockHasPaymentMethod as Mock).mockResolvedValueOnce(false);

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );

      await expect(
        caller.createTripRequest({
          tripId: "trip-1",
          pickupLat: 43.26,
          pickupLng: -79.92,
        })
      ).rejects.toThrow(/payment method/i);
    });
  });

  describe("acceptTripRequest - payment hold failure", () => {
    it("should not accept request when payment hold fails (test-ut-trip-16)", async () => {
      const driverId = "driver-123";
      const mockRequest = createMockTripRequest({
        id: "req-1",
        tripId: "trip-1",
        riderId: "rider-1",
        status: "pending",
        estimatedDistanceKm: 10,
        estimatedDurationSec: 1200,
        estimatedDetourSec: 0,
      });
      const mockTrip = createMockTrip({
        id: "trip-1",
        driverId,
        status: "active",
        bookedSeats: 0,
        maxSeats: 3,
      });

      // Mock select: get request with trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            leftJoin: vi.fn().mockReturnValueOnce({
              limit: vi
                .fn()
                .mockResolvedValueOnce([
                  { request: mockRequest, trip: mockTrip },
                ]),
            }),
          }),
        }),
      });

      // Override createPaymentHold to fail
      const { createPaymentHold: mockCreatePaymentHold } =
        await import("../../../services/payment");
      (mockCreatePaymentHold as Mock).mockResolvedValueOnce({
        success: false,
        paymentIntentId: "",
        error: "Insufficient funds",
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );

      await expect(
        caller.acceptTripRequest({ requestId: "req-1" })
      ).rejects.toThrow(/Payment failed|Insufficient funds/);
    });
  });

  describe("acceptTripRequest - retroactive discount", () => {
    it("should update existing riders' payment holds when 2nd rider joins (test-ut-trip-17)", async () => {
      const driverId = "driver-123";
      const mockRequest = createMockTripRequest({
        id: "req-2",
        tripId: "trip-1",
        riderId: "rider-2",
        status: "pending",
        estimatedDistanceKm: 10,
        estimatedDurationSec: 1200,
        estimatedDetourSec: 0,
      });
      const mockTrip = createMockTrip({
        id: "trip-1",
        driverId,
        status: "active",
        bookedSeats: 1,
        maxSeats: 3,
      });

      // Mock select: get request with trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            leftJoin: vi.fn().mockReturnValueOnce({
              limit: vi
                .fn()
                .mockResolvedValueOnce([
                  { request: mockRequest, trip: mockTrip },
                ]),
            }),
          }),
        }),
      });

      // Reset createPaymentHold to succeed
      const {
        createPaymentHold: mockCreatePaymentHold,
        updatePaymentHold: mockUpdatePaymentHold,
      } = await import("../../../services/payment");
      (mockCreatePaymentHold as Mock).mockResolvedValueOnce({
        success: true,
        paymentIntentId: "pi_new",
      });

      // Mock update: accept request
      const acceptedRequest = { ...mockRequest, status: "accepted" };
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([acceptedRequest]),
          }),
        }),
      });

      // Mock update: increment bookedSeats
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      // Mock select: get existing accepted requests for retroactive discount
      const existingRequest1 = createMockTripRequest({
        id: "req-1",
        tripId: "trip-1",
        riderId: "rider-1",
        status: "accepted",
        estimatedDistanceKm: 12,
        estimatedDurationSec: 1500,
        estimatedDetourSec: 0,
      });
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([existingRequest1]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );
      await caller.acceptTripRequest({ requestId: "req-2" });

      // Verify updatePaymentHold was called for the existing rider
      expect(mockUpdatePaymentHold).toHaveBeenCalledWith(
        "req-1",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe("cancelTrip - payment holds released", () => {
    it("should release payment holds for all accepted riders (test-ut-trip-18)", async () => {
      const driverId = "driver-123";
      const mockTrip = createMockTrip({
        id: "trip-1",
        driverId,
        status: "active",
        bookedSeats: 2,
      });

      // Mock select: get trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      // Mock update: cancel trip
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi
              .fn()
              .mockResolvedValueOnce([{ ...mockTrip, status: "cancelled" }]),
          }),
        }),
      });

      // Mock update: cancel pending requests
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      // Mock select: get accepted riders for notification
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([
              { userId: "rider-1", pushToken: "token1" },
              { userId: "rider-2", pushToken: "token2" },
            ]),
          }),
        }),
      });

      // Mock select: get accepted request IDs for payment release
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi
            .fn()
            .mockResolvedValueOnce([{ id: "req-1" }, { id: "req-2" }]),
        }),
      });

      // Mock update: cancel accepted requests
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const { cancelPaymentHold: mockCancelPaymentHold } =
        await import("../../../services/payment");

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );
      const result = await caller.cancelTrip({ tripId: "trip-1" });

      expect(result.success).toBe(true);
      // cancelPaymentHold is called in a .catch() chain, so we need to wait
      await new Promise((r) => setTimeout(r, 10));
      expect(mockCancelPaymentHold).toHaveBeenCalledWith("req-1");
      expect(mockCancelPaymentHold).toHaveBeenCalledWith("req-2");
    });
  });

  describe("completeTrip - earnings summary", () => {
    it("should return correct earnings summary (test-ut-trip-19)", async () => {
      const driverId = "driver-123";
      const mockTrip = createMockTrip({
        id: "trip-1",
        driverId,
        status: "in_progress",
        updatedAt: new Date(Date.now() - 30 * 60 * 1000), // started 30 min ago
      });

      // Mock select: get trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      // Mock select: accepted requests (should be empty for completed trip)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      // Mock select: on_trip requests (should be empty)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      // Mock update: complete trip
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi
              .fn()
              .mockResolvedValueOnce([{ ...mockTrip, status: "completed" }]),
          }),
        }),
      });

      // Mock select: get completed requests
      const completedReq1 = createMockTripRequest({
        id: "req-1",
        riderId: "rider-1",
        status: "completed",
        pickupLat: 43.26,
        pickupLng: -79.92,
      });
      const completedReq2 = createMockTripRequest({
        id: "req-2",
        riderId: "rider-2",
        status: "completed",
        pickupLat: 43.27,
        pickupLng: -79.91,
      });
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([completedReq1, completedReq2]),
        }),
      });

      // Mock select: get rider 1 name
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ name: "Rider One" }]),
          }),
        }),
      });

      // Mock select: get rider 2 name
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([{ name: "Rider Two" }]),
          }),
        }),
      });

      // Mock select: get riders with push tokens for notification
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );
      const result = await caller.completeTrip({ tripId: "trip-1" });

      expect(result.summary.passengerCount).toBe(2);
      expect(result.summary.totalEarningsCents).toBe(1500); // 2 * 750 placeholder
      expect(result.summary.perPassenger).toHaveLength(2);
      expect(result?.summary?.perPassenger?.[0]?.riderName).toBe("Rider One");
    });
  });

  describe("submitTripTip - bounds validation", () => {
    it("should process a valid tip (test-ut-trip-21)", async () => {
      const riderId = "rider-123";
      const mockTrip = createMockTrip({
        id: "trip-1",
        driverId: "driver-1",
        status: "completed",
      });
      const mockRequest = createMockTripRequest({
        id: "req-1",
        tripId: "trip-1",
        riderId,
        status: "completed",
      });

      // Mock select: get trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([mockTrip]),
          }),
        }),
      });

      // Mock select: get rider request
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([mockRequest]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );
      const result = await caller.submitTripTip({
        tripId: "trip-1",
        tipCents: 500,
      });

      expect(result.success).toBe(true);
    });

    it("should reject tip below minimum (test-ut-trip-21)", async () => {
      const riderId = "rider-123";

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );

      // tipCents: 10 is below the min of 50 in the Zod schema
      await expect(
        caller.submitTripTip({ tripId: "trip-1", tipCents: 10 })
      ).rejects.toThrow();
    });

    it("should reject tip above maximum (test-ut-trip-21)", async () => {
      const riderId = "rider-123";

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );

      // tipCents: 60000 is above the max of 50000 in the Zod schema
      await expect(
        caller.submitTripTip({ tripId: "trip-1", tipCents: 60000 })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // submitRiderReview
  // ============================================
  describe("submitRiderReview", () => {
    it("should successfully rate a rider on a completed trip (test-ut-trip-22)", async () => {
      const driverId = "driver-123";

      // Mock trip lookup → completed trip owned by this driver
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValueOnce([
              createMockTrip({ id: "trip-1", driverId, status: "completed" }),
            ]),
        }),
      });

      // Mock trip request lookup → rider was on trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([
            createMockTripRequest({
              tripId: "trip-1",
              riderId: "rider-456",
              status: "completed",
            }),
          ]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );

      const result = await caller.submitRiderReview({
        tripId: "trip-1",
        riderId: "rider-456",
        rating: 4,
        comment: "Great rider!",
      });

      expect(result).toEqual({ success: true });
    });

    it("should reject non-owner driver from rating (test-ut-trip-23)", async () => {
      const driverId = "driver-other";

      // Different driver owns the trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([
            createMockTrip({
              id: "trip-1",
              driverId: "driver-real",
              status: "completed",
            }),
          ]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );

      await expect(
        caller.submitRiderReview({
          tripId: "trip-1",
          riderId: "rider-456",
          rating: 4,
        })
      ).rejects.toThrowError("Only the driver can rate riders for this trip");
    });

    it("should reject rating for non-completed trip (test-ut-trip-24)", async () => {
      const driverId = "driver-123";

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValueOnce([
              createMockTrip({ id: "trip-1", driverId, status: "active" }),
            ]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );

      await expect(
        caller.submitRiderReview({
          tripId: "trip-1",
          riderId: "rider-456",
          rating: 4,
        })
      ).rejects.toThrowError("Trip must be completed before rating riders");
    });

    it("should reject rating for rider not on trip (test-ut-trip-25)", async () => {
      const driverId = "driver-123";

      // Trip exists and is completed
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValueOnce([
              createMockTrip({ id: "trip-1", driverId, status: "completed" }),
            ]),
        }),
      });

      // No matching request for this rider
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );

      await expect(
        caller.submitRiderReview({
          tripId: "trip-1",
          riderId: "rider-nonexistent",
          rating: 4,
        })
      ).rejects.toThrowError("Rider request not found for this trip");
    });
  });

  // ============================================
  // getAvailableTrips — date filters
  // ============================================
  describe("getAvailableTrips", () => {
    it("should filter trips by startDate (test-ut-trip-26)", async () => {
      const riderId = "rider-123";
      const future = new Date(Date.now() + 86400000); // tomorrow

      // Mock select().from().where().orderBy() → trips
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValueOnce([
              createMockTrip({
                id: "trip-1",
                driverId: "driver-1",
                status: "pending",
                departureTime: future,
              }),
            ]),
          }),
        }),
      });

      // Mock existing requests (rider has none)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );

      const result = await caller.getAvailableTrips({ startDate: new Date() });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("trip-1");
    });

    it("should filter trips by endDate (test-ut-trip-27)", async () => {
      const riderId = "rider-123";
      const future = new Date(Date.now() + 86400000);
      const endDate = new Date(Date.now() + 172800000); // day after tomorrow

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValueOnce([
              createMockTrip({
                id: "trip-2",
                driverId: "driver-2",
                status: "active",
                departureTime: future,
              }),
            ]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );

      const result = await caller.getAvailableTrips({ endDate });

      expect(result).toHaveLength(1);
    });
  });

  // ============================================
  // fixTripStatus
  // ============================================
  describe("fixTripStatus", () => {
    it("should fix a stuck pending trip with accepted riders (test-ut-trip-28)", async () => {
      const driverId = "driver-123";

      // Mock trips query → pending trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([
            {
              trip: createMockTrip({
                id: "trip-stuck",
                driverId,
                status: "pending",
              }),
            },
          ]),
        }),
      });

      // Mock count of accepted requests → 2 accepted
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([{ count: 2 }]),
        }),
      });

      // Mock update → fix trip status
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );

      const result = await caller.fixTripStatus({ tripId: "trip-stuck" });

      expect(result.success).toBe(true);
      expect(result.fixedCount).toBe(1);
      expect(result.fixedTrips[0]).toEqual(
        expect.objectContaining({
          tripId: "trip-stuck",
          oldStatus: "pending",
          newStatus: "active",
        })
      );
    });

    it("should return fixedCount 0 when no trips need fixing (test-ut-trip-29)", async () => {
      const driverId = "driver-123";

      // Mock trips query → no stuck trips found
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );

      const result = await caller.fixTripStatus({});

      expect(result.success).toBe(true);
      expect(result.fixedCount).toBe(0);
      expect(result.fixedTrips).toEqual([]);
    });
  });

  // ============================================
  // confirmRiderPickup
  // ============================================
  describe("confirmRiderPickup", () => {
    it("should confirm pickup for accepted request owned by rider (test-ut-trip-30)", async () => {
      const riderId = "rider-123";
      const confirmedAt = new Date();

      // Mock select().from().where().limit() → accepted request owned by this rider
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              createMockTripRequest({
                id: "req-1",
                riderId,
                status: "accepted",
              }),
            ]),
          }),
        }),
      });

      // Mock update().set().where().returning() → returns updated request
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValueOnce([
              createMockTripRequest({
                id: "req-1",
                riderId,
                status: "accepted",
                riderPickupConfirmedAt: confirmedAt,
              }),
            ]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );

      const result = await caller.confirmRiderPickup({ requestId: "req-1" });

      expect(result).toBeDefined();
      expect(result?.riderPickupConfirmedAt).toBe(confirmedAt);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should reject confirmation from wrong rider (test-ut-trip-31)", async () => {
      const riderId = "rider-wrong";

      // Request belongs to a different rider
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              createMockTripRequest({
                id: "req-1",
                riderId: "rider-other",
                status: "accepted",
              }),
            ]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );

      await expect(
        caller.confirmRiderPickup({ requestId: "req-1" })
      ).rejects.toThrowError(
        "You can only confirm pickup for your own requests"
      );
    });

    it("should reject confirmation for non-accepted request (test-ut-trip-32)", async () => {
      const riderId = "rider-123";

      // Request is pending, not accepted
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              createMockTripRequest({
                id: "req-1",
                riderId,
                status: "pending",
              }),
            ]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );

      await expect(
        caller.confirmRiderPickup({ requestId: "req-1" })
      ).rejects.toThrowError(
        "Request must be accepted before confirming pickup"
      );
    });
  });

  // ============================================
  // startTrip — notification branch
  // ============================================
  describe("startTrip — notifications", () => {
    it("should send notifications to accepted riders when starting (test-ut-trip-33)", async () => {
      const driverId = "driver-123";

      // Mock select → active trip owned by driver
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce([
            createMockTrip({
              id: "trip-1",
              driverId,
              status: "active",
            }),
          ]),
        }),
      });

      // Mock update().set().where().returning() → trip started
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValueOnce([
              createMockTrip({
                id: "trip-1",
                driverId,
                status: "in_progress",
              }),
            ]),
          }),
        }),
      });

      // Mock select accepted riders with push tokens (innerJoin chain)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([
              {
                userId: "rider-1",
                pushToken: "ExponentPushToken[token-1]",
              },
              {
                userId: "rider-2",
                pushToken: "ExponentPushToken[token-2]",
              },
            ]),
          }),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(driverId, mockDb as unknown)
      );

      const result = await caller.startTrip({ tripId: "trip-1" });

      expect(result.status).toBe("in_progress");
      // sendTripNotification is mocked at module level
      const { sendTripNotification } =
        await import("../../../services/notification");
      expect(sendTripNotification).toHaveBeenCalled();
    });
  });

  // ============================================
  // cancelTripRequest — accepted with payment hold
  // ============================================
  describe("cancelTripRequest — accepted path", () => {
    it("should decrement seats and release payment hold for accepted cancellation (test-ut-trip-34)", async () => {
      const riderId = "rider-123";

      // Mock select joined query → accepted request with trip
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValueOnce([
                {
                  request: createMockTripRequest({
                    id: "req-1",
                    riderId,
                    tripId: "trip-1",
                    status: "accepted",
                  }),
                  trip: createMockTrip({
                    id: "trip-1",
                    bookedSeats: 2,
                    driverId: "driver-1",
                  }),
                },
              ]),
            }),
          }),
        }),
      });

      // Mock update request → cancelled
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValueOnce([
              createMockTripRequest({
                id: "req-1",
                riderId,
                status: "cancelled",
              }),
            ]),
          }),
        }),
      });

      // Mock update trip → decrement bookedSeats
      mockDb.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext(riderId, mockDb as unknown)
      );

      const result = await caller.cancelTripRequest({ requestId: "req-1" });

      expect(result?.status).toBe("cancelled");
      // Two update calls: one for request, one for trip seats
      expect(mockDb.update).toHaveBeenCalledTimes(2);

      // cancelPaymentHold should have been called
      const { cancelPaymentHold } = await import("../../../services/payment");
      expect(cancelPaymentHold).toHaveBeenCalledWith("req-1");
    });
  });
});
