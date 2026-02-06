import { db } from "@hitchly/db/client";
import {
  users,
  profiles,
  vehicles,
  preferences,
  trips,
  tripRequests,
} from "@hitchly/db/schema";
import { eq, and, sql, or, inArray, ne } from "drizzle-orm";
import { getDetourAndRideDetails } from "./googlemaps";
import { calculateEstimatedCost, calculateCostScore } from "./pricing_service";

export type Location = { lat: number; lng: number };

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type RiderRequest = {
  riderId: string;
  origin: Location;
  destination: Location;
  desiredArrivalTime: string;
  desiredDate?: Date;
  maxOccupancy: number;
  preference?: "default" | "costPriority" | "comfortPriority";
  includeDummyMatches?: boolean;
};

export type { DriverRouteInfo, NewRiderInfo } from "./googlemaps";

export type RideMatch = {
  rideId: string;
  driverId: string;
  name: string;
  profilePic: string;
  vehicle: string;
  rating: number;
  bio: string;
  matchPercentage: number;
  uiLabel: string;
  details: {
    estimatedCost: number;
    estimatedDistanceKm: number;
    estimatedDurationSec: number;
    detourMinutes: number;
    arrivalAtPickup: string;
    availableSeats: number;
  };
  debugScores?: any;
};

// --- MATCHMAKING CONSTANTS ---
const MAX_THEORETICAL_SCORE = 7.0;

export const MAX_CANDIDATES = 20;
export const MATCH_THRESHOLD = 0.3;

const WEIGHT_PRESETS = {
  default: {
    schedule: 2.0,
    location: 2.0,
    cost: 1.5,
    comfort: 0.5,
    compatibility: 1.0,
  },
  costPriority: {
    schedule: 2.0,
    location: 2.0,
    cost: 1.75,
    comfort: 0.1,
    compatibility: 1.0,
  },
  comfortPriority: {
    schedule: 2.0,
    location: 2.0,
    cost: 1.0,
    comfort: 1.0,
    compatibility: 1.5,
  },
};

function calculateScheduleScore(riderTime: string, driverTime: string): number {
  const tRider = timeToMinutes(riderTime);
  const tDriver = timeToMinutes(driverTime);
  const timeDiff = tDriver - tRider;
  if (timeDiff >= 0 && timeDiff <= 20) return 1.0;
  if (timeDiff > 20) return Math.max(0, 1.0 - (timeDiff - 20) / 30);
  if (timeDiff < 0) return Math.max(0, 1.0 - Math.abs(timeDiff) / 60);
  return 0;
}

function calculateLocationScore(
  detourSeconds: number,
  toleranceMinutes: number
): number {
  const toleranceSeconds = toleranceMinutes * 60;
  if (detourSeconds <= toleranceSeconds) return 1.0;
  const excessTime = detourSeconds - toleranceSeconds;
  return Math.max(0.01, Math.exp(-0.005 * excessTime));
}

function calculateComfortScore(
  current: number,
  max: number,
  requested: number
): number {
  if (current + requested > max) return 0.0;
  return 1.0 - current / max;
}

function calculateCompatibilityScore(
  riderPrefs: any,
  driverPrefs: any
): number {
  if (!riderPrefs || !driverPrefs) return 0.8;

  // Hard filters (dealbreakers)
  if (!riderPrefs.smoking && driverPrefs.smoking) return 0.0;
  if (!riderPrefs.pets && driverPrefs.pets) return 0.0;

  // Soft matching (bonus points)
  let score = 0.5;
  if (riderPrefs.music && driverPrefs.music) score += 0.2;
  if (riderPrefs.chatty === driverPrefs.chatty) score += 0.3;

  return Math.min(1.0, score);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTimeFromDate(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function normalizeScore(rawScore: number): number {
  return Math.min(100, Math.round((rawScore / MAX_THEORETICAL_SCORE) * 100));
}

function computeScore(
  weights: typeof WEIGHT_PRESETS.default,
  scores: {
    schedule: number;
    location: number;
    cost: number;
    comfort: number;
    compatibility: number;
  }
): number {
  return (
    scores.schedule * weights.schedule +
    scores.location * weights.location +
    scores.cost * weights.cost +
    scores.comfort * weights.comfort +
    scores.compatibility * weights.compatibility
  );
}

export async function findMatchesForUser(
  request: RiderRequest
): Promise<RideMatch[]> {
  const [riderPrefs] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, request.riderId))
    .limit(1);

  const tripConditions = [
    or(eq(trips.status, "pending"), eq(trips.status, "active")),
    ne(trips.driverId, request.riderId),
  ];

  const dbTrips = await db
    .select({
      trip: trips,
      user: users,
      profile: profiles,
      vehicle: vehicles,
      prefs: preferences,
    })
    .from(trips)
    .innerJoin(users, eq(trips.driverId, users.id))
    .innerJoin(profiles, eq(users.id, profiles.userId))
    .innerJoin(vehicles, eq(users.id, vehicles.userId))
    .leftJoin(preferences, eq(users.id, preferences.userId))
    .where(and(...tripConditions));
  // Filter out trips that the rider has active requests for (pending or accepted only)
  const activeRequests = await db
    .select({
      tripId: tripRequests.tripId,
      status: tripRequests.status,
    })
    .from(tripRequests)
    .where(
      and(
        eq(tripRequests.riderId, request.riderId),
        or(
          eq(tripRequests.status, "pending"),
          eq(tripRequests.status, "accepted")
        )
      )
    );

  const activeRequestedTripIds = new Set(activeRequests.map((r) => r.tripId));
  // Filter out trips the rider has active requests for (pending or accepted)

  const filteredTrips = dbTrips.filter((t) => {
    const hasActiveRequest = activeRequestedTripIds.has(t.trip.id);
    const isTripCompleted =
      t.trip.status === "completed" || t.trip.status === "cancelled";

    // If trip is completed/cancelled, allow it to appear again even if there's an accepted request
    if (isTripCompleted) {
      return true;
    }
    return !hasActiveRequest;
  });

  const allRides = filteredTrips.map((row) => ({
    ride: {
      id: row.trip.id,
      driverId: row.trip.driverId,
      originLat: row.trip.originLat!,
      originLng: row.trip.originLng!,
      destLat: row.trip.destLat!,
      destLng: row.trip.destLng!,
      startTime: row.trip.departureTime,
      maxSeats: row.trip.maxSeats,
      bookedSeats: row.trip.bookedSeats,
      status: row.trip.status as "scheduled" | "pending" | "active",
    },
    user: row.user,
    driverEmail: row.user.email,
    profile: row.profile,
    vehicle: row.vehicle,
    prefs: row.prefs,
  }));

  if (allRides.length === 0) {
    return [];
  }

  const tripIds = allRides.map((r) => r.ride.id);

  const existingPickupsMap = new Map<string, Location[]>();

  try {
    // Get pickup locations for all accepted passengers (from tripRequests)
    const acceptedPassengers = await db
      .select({
        tripId: tripRequests.tripId,
        pickupLat: tripRequests.pickupLat,
        pickupLng: tripRequests.pickupLng,
      })
      .from(tripRequests)
      .where(eq(tripRequests.status, "accepted"));

    for (const passenger of acceptedPassengers) {
      if (tripIds.includes(passenger.tripId)) {
        const existingPickups = existingPickupsMap.get(passenger.tripId) || [];
        existingPickups.push({
          lat: passenger.pickupLat,
          lng: passenger.pickupLng,
        });
        existingPickupsMap.set(passenger.tripId, existingPickups);
      }
    }
  } catch {
    // Ignore error
  }

  let tripRequestCountMap = new Map<string, number>();

  if (tripIds.length > 0) {
    const tripRequestCounts = await db
      .select({
        tripId: tripRequests.tripId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(tripRequests)
      .where(
        and(
          eq(tripRequests.status, "accepted"),
          inArray(tripRequests.tripId, tripIds)
        )
      )
      .groupBy(tripRequests.tripId);

    tripRequestCountMap = new Map(
      tripRequestCounts.map((t) => [t.tripId, t.count ?? 0])
    );
  }

  const candidates = allRides.map((row) => {
    const bookedFromSchema = row.ride.bookedSeats || 0;
    const bookedFromTripRequests = tripRequestCountMap.get(row.ride.id) ?? 0;
    const currentPassengers = Math.max(
      bookedFromSchema,
      bookedFromTripRequests
    );
    const availableSeats = row.ride.maxSeats - currentPassengers;

    return {
      rideId: row.ride.id,
      driverId: row.user.id,
      driverEmail: (row as any).driverEmail || row.user.email,
      name: row.user.name || "Driver",
      image: row.user.image || "",
      vehicle: `${row.vehicle.color} ${row.vehicle.make} ${row.vehicle.model}`,
      bio: row.profile.bio || "",
      rating: 4.8, // TODO: Implement ratings system
      origin: { lat: row.ride.originLat, lng: row.ride.originLng },
      destination: { lat: row.ride.destLat, lng: row.ride.destLng },
      departureTime: row.ride.startTime,
      plannedArrivalTime: formatTimeFromDate(row.ride.startTime),
      detourTolerance: 15, // Default tolerance in minutes
      currentPassengers,
      maxPassengers: row.ride.maxSeats,
      availableSeats,
      prefs: row.prefs,
    };
  });

  // Filter out rides with no available seats
  const availableCandidates = candidates.filter(
    (c) => c.availableSeats >= request.maxOccupancy
  );
  if (availableCandidates.length === 0) return [];

  const DIRECTION_TOLERANCE_KM = 10; // Within 10km of destination

  const directionCompatibleCandidates = availableCandidates.filter((ride) => {
    // Calculate distance between driver's destination and rider's destination
    const destDistanceKm = haversineDistance(
      ride.destination.lat,
      ride.destination.lng,
      request.destination.lat,
      request.destination.lng
    );

    const originDistanceKm = haversineDistance(
      ride.origin.lat,
      ride.origin.lng,
      request.origin.lat,
      request.origin.lng
    );

    // Must be going to roughly the same destination (within tolerance)
    return destDistanceKm <= DIRECTION_TOLERANCE_KM && originDistanceKm <= 20;
  });

  if (directionCompatibleCandidates.length === 0) return [];

  const scoringPromises = directionCompatibleCandidates.map(async (ride) => {
    try {
      const existingPickups = existingPickupsMap.get(ride.rideId) || [];

      const routeDetails = await getDetourAndRideDetails(
        {
          origin: ride.origin,
          destination: ride.destination,
          existingWaypoints: existingPickups,
          departureTime: ride.departureTime,
        },
        {
          origin: request.origin,
          destination: request.destination,
        }
      );
      const cost = calculateEstimatedCost(
        routeDetails.rideDistanceKm ?? 0,
        routeDetails.rideDurationSeconds ?? 0,
        ride.currentPassengers,
        routeDetails.detourTimeInSeconds ?? 0
      );

      const sSchedule = calculateScheduleScore(
        request.desiredArrivalTime,
        ride.plannedArrivalTime
      );
      const sLocation = calculateLocationScore(
        routeDetails.detourTimeInSeconds ?? 0,
        ride.detourTolerance
      );
      const sComfort = calculateComfortScore(
        ride.currentPassengers,
        ride.maxPassengers,
        request.maxOccupancy
      );

      const sCompatibility = calculateCompatibilityScore(
        riderPrefs || null,
        ride.prefs || null
      );
      return {
        ride,
        cost,
        detourSeconds: routeDetails.detourTimeInSeconds ?? 0,
        rideDistanceKm: routeDetails.rideDistanceKm ?? 0,
        rideDurationSec: routeDetails.rideDurationSeconds ?? 0,
        scores: {
          schedule: sSchedule,
          location: sLocation,
          comfort: sComfort,
          compatibility: sCompatibility,
        },
      };
    } catch {
      return null;
    }
  });

  const scoredResults = await Promise.all(scoringPromises);
  const validScoredResults = scoredResults.filter(
    (r): r is NonNullable<typeof r> => r !== null
  );

  const minCost = Math.min(...validScoredResults.map((r) => r.cost));

  const finalMatches: (RideMatch | null)[] = validScoredResults.map(
    ({
      ride,
      cost,
      detourSeconds,
      rideDistanceKm,
      rideDurationSec,
      scores,
    }) => {
      const sCost = calculateCostScore(cost, minCost);
      const weights = WEIGHT_PRESETS[request.preference || "default"];

      const allScores = { ...scores, cost: sCost };
      const totalScore = computeScore(weights, allScores);
      const matchPercentage = normalizeScore(totalScore);
      if (scores.compatibility === 0) {
        return null;
      }

      return {
        rideId: ride.rideId,
        driverId: ride.driverId,
        name: ride.name,
        profilePic: ride.image,
        vehicle: ride.vehicle,
        rating: ride.rating,
        bio: ride.bio,
        matchPercentage,
        uiLabel:
          matchPercentage > 85
            ? "Great Match"
            : matchPercentage > 60
              ? "Good Match"
              : "Fair Match",
        details: {
          estimatedCost: cost ?? 0,
          estimatedDistanceKm: rideDistanceKm,
          estimatedDurationSec: rideDurationSec,
          detourMinutes: Math.round((detourSeconds ?? 0) / 60),
          arrivalAtPickup: ride.plannedArrivalTime || "",
          availableSeats: ride.availableSeats ?? 0,
        },
        debugScores: { ...scores, cost: sCost },
      };
    }
  );

  const validMatches = finalMatches.filter((m): m is RideMatch => m !== null);

  // Test driver emails (from seed scripts) - these should be filtered when toggle is OFF
  // Note: "driver@mcmaster.ca" removed from list as it's used for real testing
  const TEST_DRIVER_EMAILS = [
    "burhan.test@mcmaster.ca",
    "sarim.test@mcmaster.ca",
    "hamzah.test@mcmaster.ca",
    "aidan.test@mcmaster.ca",
  ];

  const testDriverUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, TEST_DRIVER_EMAILS));

  const testDriverIds = new Set(testDriverUsers.map((u) => u.id));

  const matchesWithoutDummies = validMatches.filter(
    (m) => !m.rideId.startsWith("dummy-")
  );

  const realMatches = matchesWithoutDummies.filter((m) => {
    if (testDriverIds.has(m.driverId)) {
      return request.includeDummyMatches === true;
    }
    return true;
  });

  // If dummy matches are requested, generate and add them to the results
  if (request.includeDummyMatches) {
    const dummyMatches = generateDummyMatches(request);
    // Combine real matches with dummy matches
    const allMatches = [...realMatches, ...dummyMatches];
    return allMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  // Return only real matches (dummy matches are filtered out when toggle is disabled)
  return realMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/**
 * Generate dummy matches for testing purposes
 */
function generateDummyMatches(request: RiderRequest): RideMatch[] {
  const dummyDrivers = [
    {
      name: "Alex Johnson",
      vehicle: "Blue Honda Civic",
      bio: "Friendly driver, love music and chatting",
      rating: 4.9,
      matchPercentage: 85,
    },
    {
      name: "Sarah Chen",
      vehicle: "Red Toyota Camry",
      bio: "Quiet ride, prefer minimal conversation",
      rating: 4.7,
      matchPercentage: 72,
    },
    {
      name: "Mike Thompson",
      vehicle: "Black Ford Focus",
      bio: "Early morning commuter, punctual",
      rating: 4.8,
      matchPercentage: 78,
    },
    {
      name: "Emily Davis",
      vehicle: "White Nissan Altima",
      bio: "Student driver, flexible schedule",
      rating: 4.6,
      matchPercentage: 65,
    },
    {
      name: "David Wilson",
      vehicle: "Gray Hyundai Elantra",
      bio: "Experienced driver, safety first",
      rating: 4.9,
      matchPercentage: 80,
    },
  ];

  // Generate dummy matches with slight variations from rider's origin
  return dummyDrivers.map((driver, index) => {
    // Add small random offset to origin (within ~5km)
    const latOffset = (Math.random() - 0.5) * 0.05; // ~5km max
    const lngOffset = (Math.random() - 0.5) * 0.05;

    // Calculate approximate cost based on distance
    const distanceKm = Math.sqrt(latOffset ** 2 + lngOffset ** 2) * 111; // Rough conversion
    const estimatedCost = Math.max(
      5,
      Math.round(distanceKm * 1.5 + Math.random() * 5)
    );

    // Calculate arrival time (within 30 minutes of desired time)
    const desiredMinutes = timeToMinutes(request.desiredArrivalTime);
    const timeVariation = (Math.random() - 0.5) * 30; // ±15 minutes
    const arrivalMinutes = desiredMinutes + timeVariation;
    const arrivalHours = Math.floor(arrivalMinutes / 60) % 24;
    const arrivalMins = Math.floor(arrivalMinutes % 60);
    const arrivalTime = `${arrivalHours.toString().padStart(2, "0")}:${arrivalMins.toString().padStart(2, "0")}`;

    return {
      rideId: `dummy-${index}-${Date.now()}`,
      driverId: `dummy-driver-${index}`,
      name: driver.name,
      profilePic: "",
      vehicle: driver.vehicle,
      rating: driver.rating,
      bio: driver.bio,
      matchPercentage: driver.matchPercentage,
      uiLabel:
        driver.matchPercentage > 85
          ? "Great Match"
          : driver.matchPercentage > 60
            ? "Good Match"
            : "Fair Match",
      details: {
        estimatedCost,
        estimatedDistanceKm: distanceKm,
        estimatedDurationSec: Math.round(distanceKm * 60), // Rough estimate: 1 min per km
        detourMinutes: Math.round(Math.abs(timeVariation)),
        arrivalAtPickup: arrivalTime,
        availableSeats: Math.floor(Math.random() * 3) + 1, // 1-3 seats
      },
    };
  });
}
