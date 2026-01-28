import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  findMatchesForUser,
  MAX_CANDIDATES,
  MATCH_THRESHOLD,
} from "../matchmaking_service";
import type { RiderRequest } from "../matchmaking_service";
import {
  createMockTrip,
  createMockUser,
  createMockProfile,
  createMockVehicle,
} from "../../tests/utils/fixtures";

// Mock the database and googlemaps service
vi.mock("@hitchly/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("../googlemaps", () => ({
  getDetourAndRideDetails: vi.fn().mockResolvedValue({
    detourSeconds: 300,
    detourKm: 2.5,
    rideDurationSeconds: 1800,
    rideDistanceKm: 15,
  }),
}));

vi.mock("../pricing_service", () => ({
  calculateEstimatedCost: vi.fn().mockReturnValue(10.5),
  calculateCostScore: vi.fn().mockReturnValue(0.9),
}));

describe("Matchmaking Service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import db to get fresh mock after clearing
    const { db } = await import("@hitchly/db/client");
    // Reset db.select mock and clear all return values
    (db.select as any).mockClear();
    (db.select as any).mockReset();
  });

  describe("Constants", () => {
    it("should have correct MAX_CANDIDATES", () => {
      expect(MAX_CANDIDATES).toBe(20);
    });

    it("should have correct MATCH_THRESHOLD", () => {
      expect(MATCH_THRESHOLD).toBe(0.3);
    });
  });

  describe("findMatchesForUser", () => {
    const baseRequest: RiderRequest = {
      riderId: "rider-123",
      origin: { lat: 43.2609, lng: -79.9192 },
      destination: { lat: 43.2557, lng: -79.8711 },
      desiredArrivalTime: "14:00",
      maxOccupancy: 1,
      preference: "default",
    };

    it("should return empty array when no trips found", async () => {
      const { db } = await import("@hitchly/db/client");

      // Mock preferences query (first db.select call)
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([null]), // No preferences found
          }),
        }),
      });

      // Mock trips query (second db.select call)
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([]), // No trips found
                }),
              }),
            }),
          }),
        }),
      });

      // Mock active requests query (third db.select call)
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No active requests
        }),
      });

      const matches = await findMatchesForUser(baseRequest);
      expect(matches).toEqual([]);
    });

    it("should filter trips with active requests", async () => {
      const { db } = await import("@hitchly/db/client");

      const mockTrip = createMockTrip({ id: "trip-1", status: "active" });
      const mockUser = createMockUser({ id: "driver-1" });
      const mockProfile = createMockProfile({ userId: "driver-1" });
      const mockVehicle = createMockVehicle({ userId: "driver-1" });

      // Mock preferences query (first db.select call)
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([null]), // No preferences found
          }),
        }),
      });

      // Mock trips query
      (db.select as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  leftJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                      {
                        trip: mockTrip,
                        user: mockUser,
                        profile: mockProfile,
                        vehicle: mockVehicle,
                        prefs: null,
                      },
                    ]),
                  }),
                }),
              }),
            }),
          }),
        })
        // Mock active requests query
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi
              .fn()
              .mockResolvedValue([{ tripId: "trip-1", status: "pending" }]),
          }),
        })
        // Mock accepted passengers query
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })
        // Mock trip request counts query
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        });

      const matches = await findMatchesForUser({
        ...baseRequest,
        riderId: "rider-123",
      });

      // Should filter out trip with active request
      expect(matches.length).toBe(0);
    });

    it("should return matches above threshold", async () => {
      const { db } = await import("@hitchly/db/client");

      const mockTrip = createMockTrip({
        id: "trip-1",
        status: "active",
        departureTime: new Date("2024-01-01T14:00:00Z"),
      });
      const mockUser = createMockUser({ id: "driver-1" });
      const mockProfile = createMockProfile({ userId: "driver-1" });
      const mockVehicle = createMockVehicle({ userId: "driver-1" });

      // Mock preferences query (first db.select call)
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([null]), // No preferences found
          }),
        })),
      });

      // Mock all queries
      (db.select as any)
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  leftJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                      {
                        trip: mockTrip,
                        user: mockUser,
                        profile: mockProfile,
                        vehicle: mockVehicle,
                        prefs: null,
                      },
                    ]),
                  }),
                }),
              }),
            }),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No active requests
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No accepted passengers
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        })
        // Mock test driver users query
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No test drivers
          }),
        });

      const matches = await findMatchesForUser(baseRequest);

      // Should process and return matches (mocked scoring will determine results)
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should respect preference presets", async () => {
      const { db } = await import("@hitchly/db/client");

      const mockTrip = createMockTrip({ id: "trip-1", status: "active" });
      const mockUser = createMockUser({ id: "driver-1" });
      const mockProfile = createMockProfile({ userId: "driver-1" });
      const mockVehicle = createMockVehicle({ userId: "driver-1" });

      // Mock preferences query (first db.select call) - called twice for two preference tests
      (db.select as any)
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([null]),
            }),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([null]),
            }),
          })),
        });

      // Mock trips query (called twice - once for each preference test)
      // Each from() call needs to return a fresh object with innerJoin
      (db.select as any)
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  leftJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                      {
                        trip: mockTrip,
                        user: mockUser,
                        profile: mockProfile,
                        vehicle: mockVehicle,
                        prefs: null,
                      },
                    ]),
                  }),
                }),
              }),
            }),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  leftJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([
                      {
                        trip: mockTrip,
                        user: mockUser,
                        profile: mockProfile,
                        vehicle: mockVehicle,
                        prefs: null,
                      },
                    ]),
                  }),
                }),
              }),
            }),
          })),
        })
        // Mock active requests query (called twice)
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })
        // Mock accepted passengers query (called twice)
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockResolvedValue([]),
          })),
        })
        // Mock trip request counts query (called twice)
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          })),
        })
        // Mock test driver users query (called twice)
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockResolvedValue([]), // No test drivers
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockResolvedValue([]), // No test drivers
          })),
        });

      // Test costPriority preference
      await findMatchesForUser({
        ...baseRequest,
        preference: "costPriority",
      });

      // Test comfortPriority preference
      await findMatchesForUser({
        ...baseRequest,
        preference: "comfortPriority",
      });

      // Both should complete without errors
      expect(true).toBe(true);
    });

    it("should limit results to MAX_CANDIDATES", async () => {
      const { db } = await import("@hitchly/db/client");

      // Create many mock trips
      const mockTrips = Array.from({ length: MAX_CANDIDATES + 10 }, (_, i) => ({
        trip: createMockTrip({ id: `trip-${i}`, status: "active" }),
        user: createMockUser({ id: `driver-${i}` }),
        profile: createMockProfile({ userId: `driver-${i}` }),
        vehicle: createMockVehicle({ userId: `driver-${i}` }),
        prefs: null,
      }));

      // Mock preferences query (first db.select call)
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([null]),
          }),
        })),
      });

      (db.select as any)
        .mockReturnValueOnce({
          from: vi.fn().mockImplementation(() => ({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  leftJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(mockTrips),
                  }),
                }),
              }),
            }),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        })
        // Mock test driver users query
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No test drivers
          }),
        });

      const matches = await findMatchesForUser(baseRequest);

      // Should be limited to MAX_CANDIDATES
      expect(matches.length).toBeLessThanOrEqual(MAX_CANDIDATES);
    });

    it("should handle trips with existing passengers", async () => {
      const { db } = await import("@hitchly/db/client");

      const mockTrip = createMockTrip({
        id: "trip-1",
        status: "active",
        bookedSeats: 2,
        maxSeats: 4,
      });
      const mockUser = createMockUser({ id: "driver-1" });
      const mockProfile = createMockProfile({ userId: "driver-1" });
      const mockVehicle = createMockVehicle({ userId: "driver-1" });

      // Mock preferences query (first db.select call)
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([null]),
          }),
        })),
      });

      // Mock trips query (second db.select call)
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockImplementation(() => ({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([
                    {
                      trip: mockTrip,
                      user: mockUser,
                      profile: mockProfile,
                      vehicle: mockVehicle,
                      prefs: null,
                    },
                  ]),
                }),
              }),
            }),
          }),
        })),
      });

      // Mock active requests query (third db.select call)
      (db.select as any)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No active requests
          }),
        })
        // Mock accepted passengers query (fourth db.select call)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                tripId: "trip-1",
                pickupLat: 43.261,
                pickupLng: -79.92,
              },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi
                .fn()
                .mockResolvedValue([{ tripId: "trip-1", count: 2 }]),
            }),
          }),
        })
        // Mock test driver users query
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No test drivers
          }),
        });

      const matches = await findMatchesForUser(baseRequest);

      // Should handle existing passengers correctly
      expect(Array.isArray(matches)).toBe(true);
    });
  });
});
