import { db } from "@hitchly/db/client";
import {
  users,
  profiles,
  vehicles,
  preferences,
  rides,
  rideRequests,
} from "@hitchly/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { getDetourAndRideDetails } from "./googlemaps";
import { calculateEstimatedCost, calculateCostScore } from "./pricing_service";

// --- TYPES ---
export type Location = { lat: number; lng: number };

export type RiderRequest = {
  riderId: string;
  origin: Location;
  destination: Location;
  desiredArrivalTime: string;
  maxOccupancy: number;
  preference?: "default" | "costPriority" | "comfortPriority";
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
  // 1. FETCH RIDER'S PREFERENCES
  const riderPrefs = await db.query.preferences.findFirst({
    where: eq(preferences.userId, request.riderId),
  });

  // 2. QUERY SCHEDULED RIDES
  const dbRides = await db
    .select({
      ride: rides,
      user: users,
      profile: profiles,
      vehicle: vehicles,
      prefs: preferences,
    })
    .from(rides)
    .innerJoin(users, eq(rides.driverId, users.id))
    .innerJoin(profiles, eq(users.id, profiles.userId))
    .innerJoin(vehicles, eq(users.id, vehicles.userId))
    .leftJoin(preferences, eq(users.id, preferences.userId))
    .where(
      and(
        eq(rides.status, "scheduled"),
        gte(rides.maxSeats, request.maxOccupancy)
      )
    );

  if (dbRides.length === 0) {
    return [];
  }

  // 3. For each ride, count accepted requests and get their pickup locations
  const rideIds = dbRides.map((r) => r.ride.id);

  // Count accepted passengers per ride
  let passengerCountMap = new Map<string, number>();
  // Store existing passenger pickup locations per ride
  const existingPickupsMap = new Map<string, Location[]>();

  try {
    const passengerCounts = await db
      .select({
        rideId: rideRequests.rideId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(rideRequests)
      .where(eq(rideRequests.status, "accepted"))
      .groupBy(rideRequests.rideId);

    passengerCountMap = new Map(
      passengerCounts
        .filter((p) => rideIds.includes(p.rideId))
        .map((p) => [p.rideId, p.count ?? 0])
    );

    // Get pickup locations for all accepted passengers
    const acceptedPassengers = await db
      .select({
        rideId: rideRequests.rideId,
        pickupLat: rideRequests.pickupLat,
        pickupLng: rideRequests.pickupLng,
      })
      .from(rideRequests)
      .where(eq(rideRequests.status, "accepted"));

    // Group pickup locations by rideId
    for (const passenger of acceptedPassengers) {
      if (rideIds.includes(passenger.rideId)) {
        const existingPickups = existingPickupsMap.get(passenger.rideId) || [];
        existingPickups.push({
          lat: passenger.pickupLat,
          lng: passenger.pickupLng,
        });
        existingPickupsMap.set(passenger.rideId, existingPickups);
      }
    }
  } catch {
    // Silently continue - rides will be processed with empty passenger data
  }

  // 4. MAP & SCORE
  const candidates = dbRides.map((row) => {
    // Use bookedSeats from schema, fallback to calculated count
    const bookedFromSchema = row.ride.bookedSeats;
    const bookedFromRequests = passengerCountMap.get(row.ride.id) ?? 0;
    const currentPassengers = Math.max(bookedFromSchema, bookedFromRequests);
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
      // Get existing passenger pickup locations for this ride
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

  return validMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);
}
