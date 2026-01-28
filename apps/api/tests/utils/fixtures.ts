import { TIME_WINDOW_MIN } from "@hitchly/db/schema";

/**
 * Test fixtures for trip module tests
 */

export const createMockUser = (overrides?: Partial<any>) => ({
  id: "user-123",
  name: "Test User",
  email: "test@mcmaster.ca",
  emailVerified: true,
  image: null,
  pushToken: "ExponentPushToken[test-token]",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockTrip = (overrides?: Partial<any>) => ({
  id: "trip-123",
  driverId: "user-123",
  origin: "McMaster University",
  destination: "Downtown Hamilton",
  originLat: 43.2609,
  originLng: -79.9192,
  destLat: 43.2557,
  destLng: -79.8711,
  departureTime: new Date(Date.now() + TIME_WINDOW_MIN * 60 * 1000 + 1000),
  maxSeats: 3,
  bookedSeats: 0,
  status: "pending" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockTripRequest = (overrides?: Partial<any>) => ({
  id: "request-123",
  tripId: "trip-123",
  riderId: "rider-123",
  pickupLat: 43.2609,
  pickupLng: -79.9192,
  dropoffLat: null,
  dropoffLng: null,
  status: "pending" as const,
  riderPickupConfirmedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockProfile = (overrides?: Partial<any>) => ({
  id: "profile-123",
  userId: "user-123",
  bio: "Test bio",
  faculty: "Engineering",
  year: 3,
  universityRole: "student" as const,
  appRole: "driver" as const,
  defaultAddress: null,
  defaultLat: null,
  defaultLong: null,
  updatedAt: new Date(),
  ...overrides,
});

export const createMockVehicle = (overrides?: Partial<any>) => ({
  id: "vehicle-123",
  userId: "user-123",
  make: "Toyota",
  model: "Camry",
  color: "Blue",
  year: 2020,
  licensePlate: "ABC123",
  updatedAt: new Date(),
  ...overrides,
});

export const createMockPreferences = (overrides?: Partial<any>) => ({
  id: "pref-123",
  userId: "user-123",
  music: true,
  chatty: true,
  smoking: false,
  pets: false,
  updatedAt: new Date(),
  ...overrides,
});
