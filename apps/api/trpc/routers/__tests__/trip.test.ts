import type { Context } from "../../context";
import {
  MAX_SEATS,
  TIME_WINDOW_MIN,
  trips,
  tripRequests,
  users,
} from "../../../db/schema";
import { tripRouter } from "../trip";

// Mock database with proper chaining
const createMockDb = () => {
  const mockDb: any = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };

  // Setup select chain
  mockDb.select.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn(),
      }),
    }),
  });

  // Setup insert chain
  mockDb.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn(),
    }),
  });

  // Setup update chain
  mockDb.update.mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn(),
      }),
    }),
  });

  return mockDb;
};

// Mock context
const createMockContext = (userId?: string, db?: any): Context => ({
  req: {} as any,
  res: {} as any,
  db: db || createMockDb(),
  userId,
});

describe("Trip Router", () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDb();
  });

  describe("createTrip", () => {
    const validInput = {
      origin: "McMaster University",
      destination: "Downtown Hamilton",
      departureTime: new Date(Date.now() + TIME_WINDOW_MIN * 60 * 1000 + 1000),
      availableSeats: 3,
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
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockUser]),
        }),
      });

      // Setup trip insert
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValueOnce({
          returning: jest.fn().mockResolvedValueOnce([mockTrip]),
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
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockUser]),
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
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockUser]),
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
        availableSeats: 10, // Exceeds MAX_SEATS
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
        "Unauthorized"
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
          availableSeats: 2,
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
          availableSeats: 4,
          status: "active" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            orderBy: jest.fn().mockResolvedValueOnce(mockTrips),
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
          availableSeats: 2,
          status: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            orderBy: jest.fn().mockResolvedValueOnce(mockTrips),
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
        availableSeats: 2,
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
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      // Mock requests lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce(mockRequests),
        }),
      });

      const caller = tripRouter.createCaller(
        createMockContext("user123", mockDb)
      );
      const result = await caller.getTripById({ tripId });

      expect(result).toEqual({
        ...mockTrip,
        requests: mockRequests,
      });
    });

    it("should throw error if trip not found", async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([]),
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
        availableSeats: 4,
      };

      // Mock trip lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      // Mock update
      const updatedTrip = { ...mockTrip, ...updates };
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            returning: jest.fn().mockResolvedValueOnce([updatedTrip]),
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
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockTrip]),
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
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockTrip]),
        }),
      });

      // Mock trip update
      const cancelledTrip = { ...mockTrip, status: "cancelled" as const };
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            returning: jest.fn().mockResolvedValueOnce([cancelledTrip]),
          }),
        }),
      });

      // Mock trip requests update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce(undefined),
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
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockTrip]),
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
});
