import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Google Maps client - must be before importing the service
// Define mockClient inside the mock factory to avoid initialization order issues
vi.mock("@googlemaps/google-maps-services-js", () => {
  const mockClient = {
    directions: vi.fn(),
    geocode: vi.fn(),
  };
  return {
    Client: vi.fn().mockImplementation(() => mockClient),
    __mockClient: mockClient, // Export for test access
  };
});

// Mock database
vi.mock("@hitchly/db/client", () => ({
  db: {
    select: vi.fn(),
  },
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
}));

vi.mock("@hitchly/db/schema", () => ({
  routes: {},
}));

// Import after mocks are set up
import {
  geocodeAddress,
  getRouteDetails,
  getDetourAndRideDetails,
} from "../googlemaps";
import { Client } from "@googlemaps/google-maps-services-js";

// Get mock client instance
const getMockClient = () => {
  const MockedClient = vi.mocked(Client);
  return new MockedClient({}) as any;
};

describe("Google Maps Service", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = getMockClient();
    mockClient.directions = vi.fn();
    mockClient.geocode = vi.fn();
  });

  describe("geocodeAddress", () => {
    it("should return lat/lng for valid address", async () => {
      const mockResponse = {
        data: {
          results: [
            {
              geometry: {
                location: {
                  lat: 43.2609,
                  lng: -79.9192,
                },
              },
            },
          ],
        },
      };

      mockClient.geocode.mockResolvedValue(mockResponse);

      const result = await geocodeAddress("McMaster University");

      expect(result).toEqual({ lat: 43.2609, lng: -79.9192 });
      expect(mockClient.geocode).toHaveBeenCalled();
    });
  });

  describe("getRouteDetails", () => {
    it("should return duration and distance for route", async () => {
      const mockResponse = {
        data: {
          routes: [
            {
              legs: [
                {
                  duration: { value: 1800 }, // 30 minutes
                  distance: { value: 15000 }, // 15 km
                },
              ],
            },
          ],
        },
      };

      mockClient.directions.mockResolvedValue(mockResponse);

      const result = await getRouteDetails(
        { lat: 43.2609, lng: -79.9192 },
        { lat: 43.2557, lng: -79.8711 },
        [],
        new Date()
      );

      expect(result.totalDurationSeconds).toBe(1800);
      expect(result.totalDistanceMeters).toBe(15000);
    });

    it("should handle route with waypoints", async () => {
      const mockResponse = {
        data: {
          routes: [
            {
              legs: [
                {
                  duration: { value: 1800 }, // 30 minutes
                  distance: { value: 15000 }, // 15 km
                },
                {
                  duration: { value: 600 }, // 10 minutes
                  distance: { value: 5000 }, // 5 km
                },
              ],
              waypoint_order: [0, 1],
            },
          ],
        },
      };

      mockClient.directions.mockResolvedValue(mockResponse);

      const result = await getRouteDetails(
        { lat: 43.2609, lng: -79.9192 },
        { lat: 43.2557, lng: -79.8711 },
        [{ lat: 43.261, lng: -79.92 }],
        new Date()
      );

      expect(result.totalDurationSeconds).toBe(2400); // 30 + 10 minutes
      expect(result.totalDistanceMeters).toBe(20000); // 15 + 5 km
      expect(result.waypointOrder).toEqual([0, 1]);
    });

    it("should handle route with waypoints", async () => {
      const mockResponse = {
        data: {
          routes: [
            {
              legs: [
                {
                  duration: { value: 900 },
                  distance: { value: 10000 },
                },
              ],
              waypoint_order: [],
            },
          ],
        },
      };

      mockClient.directions.mockResolvedValue(mockResponse);

      const waypoints = [
        { lat: 43.261, lng: -79.92 },
        { lat: 43.262, lng: -79.921 },
      ];

      const result = await getRouteDetails(
        { lat: 43.2609, lng: -79.9192 },
        { lat: 43.2557, lng: -79.8711 },
        waypoints,
        new Date(),
        true // optimize
      );

      expect(result.totalDurationSeconds).toBe(900);
      expect(result.totalDistanceMeters).toBe(10000);
    });

    it("should throw error when no route found", async () => {
      mockClient.directions.mockResolvedValue({
        data: {
          routes: [],
        },
      });

      await expect(
        getRouteDetails(
          { lat: 43.2609, lng: -79.9192 },
          { lat: 43.2557, lng: -79.8711 },
          [],
          new Date()
        )
      ).rejects.toThrow("No route found");
    });
  });

  describe("getDetourAndRideDetails", () => {
    it("should calculate detour time and distance", async () => {
      // Mock route without rider
      mockClient.directions.mockResolvedValueOnce({
        data: {
          routes: [
            {
              legs: [
                {
                  duration: { value: 1800 }, // 30 min
                  distance: { value: 15000 }, // 15 km
                },
              ],
            },
          ],
        },
      });


      // Mock route with rider pickup
      mockClient.directions.mockResolvedValueOnce({
        data: {
          routes: [
            {
              legs: [
                { duration: { value: 600 }, distance: { value: 5000 } }, // To pickup
                { duration: { value: 1800 }, distance: { value: 15000 } }, // To destination
              ],
            },
          ],
        },
      });

      const result = await getDetourAndRideDetails(
        {
          origin: { lat: 43.2609, lng: -79.9192 },
          destination: { lat: 43.2557, lng: -79.8711 },
          existingWaypoints: [],
        },
        {
          origin: { lat: 43.261, lng: -79.92 },
          destination: { lat: 43.2557, lng: -79.8711 },
        }
      );

      expect(result).toHaveProperty("detourTimeInSeconds");
      expect(result).toHaveProperty("rideDistanceKm");
      expect(result).toHaveProperty("rideDurationSeconds");
    });
  });
});
