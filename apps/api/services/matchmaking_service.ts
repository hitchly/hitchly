import { db } from "@hitchly/db/client";
import {
  users,
  profiles,
  vehicles,
  preferences,
  trips,
  tripRequests,
} from "@hitchly/db/schema";
import { eq, and, gte, lte, sql, or, ne, inArray } from "drizzle-orm";
import { getDetourAndRideDetails } from "./googlemaps";
import { calculateEstimatedCost, calculateCostScore } from "./pricing_service";

// --- TYPES ---
export type Location = { lat: number; lng: number };

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

/**
 * findMatchesForUser - Retrieves candidate list, filters, and scores matches
 */
export async function findMatchesForUser(
  request: RiderRequest
): Promise<RideMatch[]> {
  // #region agent log - declare LOG_ENDPOINT once for all logs
  const LOG_ENDPOINT =
    "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9";
  // #endregion agent log

  // 1. FETCH RIDER'S PREFERENCES
  const riderPrefs = await db.query.preferences.findFirst({
    where: eq(preferences.userId, request.riderId),
  });

  // 2. QUERY TRIPS (unified table)
  const tripConditions = [
    or(
      eq(trips.status, "pending"),
      eq(trips.status, "scheduled"),
      eq(trips.status, "active")
    ),
    ne(trips.driverId, request.riderId), // Exclude trips where user is the driver
  ];

  // Filter by date if provided
  if (request.desiredDate) {
    const startOfDay = new Date(request.desiredDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(request.desiredDate);
    endOfDay.setHours(23, 59, 59, 999);
    tripConditions.push(gte(trips.departureTime, startOfDay));
    tripConditions.push(lte(trips.departureTime, endOfDay));
  }

  // Only include trips with coordinates (required for matching)
  tripConditions.push(sql`${trips.originLat} IS NOT NULL`);
  tripConditions.push(sql`${trips.originLng} IS NOT NULL`);
  tripConditions.push(sql`${trips.destLat} IS NOT NULL`);
  tripConditions.push(sql`${trips.destLng} IS NOT NULL`);

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

  // Convert trips to ride format (for compatibility with existing scoring logic)
  const allRides = dbTrips.map((row) => ({
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
    profile: row.profile,
    vehicle: row.vehicle,
    prefs: row.prefs,
  }));

  if (allRides.length === 0) {
    return [];
  }

  // 4. For each trip, count accepted requests and get their pickup locations
  const tripIds = allRides.map((r) => r.ride.id);

  // Store existing passenger pickup locations per trip
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

    // Group pickup locations by tripId
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
    // Silently continue - trips will be processed with empty passenger data
  }

  // Get trip request counts for all trips
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

  // 3. MAP & SCORE
  const candidates = allRides.map((row) => {
    // Use bookedSeats from schema, fallback to calculated count from tripRequests
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

  const scoringPromises = availableCandidates.map(async (ride) => {
    try {
      // Get existing passenger pickup locations for this trip
      const existingPickups = existingPickupsMap.get(ride.rideId) || [];

      // A. Route Logic - include existing passengers in calculation
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
        routeDetails.rideDistanceKm,
        routeDetails.rideDurationSeconds,
        ride.currentPassengers,
        routeDetails.detourTimeInSeconds
      );

      // B. Scoring Logic
      const sSchedule = calculateScheduleScore(
        request.desiredArrivalTime,
        ride.plannedArrivalTime
      );
      const sLocation = calculateLocationScore(
        routeDetails.detourTimeInSeconds,
        ride.detourTolerance
      );
      const sComfort = calculateComfortScore(
        ride.currentPassengers,
        ride.maxPassengers,
        request.maxOccupancy
      );

      // C. Compatibility Check
      const sCompatibility = calculateCompatibilityScore(
        riderPrefs,
        ride.prefs
      );
      return {
        ride,
        cost,
        detourSeconds: routeDetails.detourTimeInSeconds,
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
    ({ ride, cost, detourSeconds, scores }) => {
      const sCost = calculateCostScore(cost, minCost);
      const weights = WEIGHT_PRESETS[request.preference || "default"];

      const allScores = { ...scores, cost: sCost };
      const totalScore = computeScore(weights, allScores);
      const matchPercentage = normalizeScore(totalScore);
      // Dealbreaker check
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
          estimatedCost: cost,
          detourMinutes: Math.round(detourSeconds / 60),
          arrivalAtPickup: ride.plannedArrivalTime,
          availableSeats: ride.availableSeats,
        },
        debugScores: { ...scores, cost: sCost },
      };
    }
  );

  const validMatches = finalMatches.filter((m): m is RideMatch => m !== null);

  // Test driver emails (from seed scripts) - these should be filtered when toggle is OFF
  const TEST_DRIVER_EMAILS = [
    "driver@mcmaster.ca",
    "burhan.test@mcmaster.ca",
    "sarim.test@mcmaster.ca",
    "hamzah.test@mcmaster.ca",
    "aidan.test@mcmaster.ca",
  ];

  // Get test driver user IDs by looking up their emails
  const testDriverUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, TEST_DRIVER_EMAILS));

  const testDriverIds = new Set(testDriverUsers.map((u) => u.id));

  // Filter out generated dummy matches (by rideId prefix)
  const matchesWithoutDummies = validMatches.filter(
    (m) => !m.rideId.startsWith("dummy-")
  );

  // Filter out test driver trips (seeded trips)
  const realMatches = matchesWithoutDummies.filter((m) => {
    // If driver is a test driver, filter it out (seeded trip)
    if (testDriverIds.has(m.driverId)) {
      return false;
    }
    // Otherwise, keep it
    return true;
  });

  // #region agent log
  fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "matchmaking_service.ts:507",
      message: "After filtering dummy matches and test drivers",
      data: {
        includeDummyMatches: request.includeDummyMatches,
        validMatchesCount: validMatches.length,
        matchesWithoutDummiesCount: matchesWithoutDummies.length,
        testDriverIds: Array.from(testDriverIds),
        testDriverEmails: TEST_DRIVER_EMAILS,
        realMatchesCount: realMatches.length,
        realMatchIds: realMatches.map((m) => m.rideId),
        filteredOutTestTrips: matchesWithoutDummies.length - realMatches.length,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      hypothesisId: "E",
    }),
  }).catch(() => {});
  // #endregion agent log

  // If dummy matches are requested, generate and add them to the results
  if (request.includeDummyMatches) {
    const dummyMatches = generateDummyMatches(request);
    // #region agent log
    fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "matchmaking_service.ts:516",
        message: "Generating dummy matches",
        data: {
          dummyMatchesCount: dummyMatches.length,
          dummyMatchIds: dummyMatches.map((m) => m.rideId),
          totalMatches: realMatches.length + dummyMatches.length,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "F",
      }),
    }).catch(() => {});
    // #endregion agent log
    // Combine real matches with dummy matches
    const allMatches = [...realMatches, ...dummyMatches];
    return allMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  // Return only real matches (dummy matches are filtered out when toggle is disabled)
  // #region agent log
  fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "matchmaking_service.ts:523",
      message: "Returning only real matches",
      data: {
        realMatchesCount: realMatches.length,
        realMatchIds: realMatches.map((m) => m.rideId),
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      hypothesisId: "G",
    }),
  }).catch(() => {});
  // #endregion agent log
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
        detourMinutes: Math.round(Math.abs(timeVariation)),
        arrivalAtPickup: arrivalTime,
        availableSeats: Math.floor(Math.random() * 3) + 1, // 1-3 seats
      },
    };
  });
}
