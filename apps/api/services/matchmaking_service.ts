// apps/api/services/matchmaking_service.ts

import { getDetourAndRideDetails } from "./googlemaps";

export type Location = {
  lat: number;
  lng: number;
};

// ... (Keep your existing CONSTANTS like PLATFORM_BASE_FARE here) ...
const PLATFORM_BASE_FARE = 2.5;
const PLATFORM_RATE_PER_KM = 0.2;
const PLATFORM_RATE_PER_MINUTE = 0.1;

const WEIGHT_PRESETS = {
  default: { schedule: 2.0, location: 2.0, cost: 1.5, comfort: 0.5 },
  costPriority: { schedule: 2.0, location: 2.0, cost: 1.75, comfort: 0.1 },
  comfortPriority: { schedule: 2.0, location: 2.0, cost: 1.0, comfort: 1.0 },
};

const MAX_THEORETICAL_SCORE = 6.0;

const COST_DISCOUNT_TIERS = {
  0: 0.0,
  1: 0.15,
  2: 0.25,
  3: 0.35,
};

export type RiderProfile = {
  id: string;
  city: string;
  origin: Location;
  destination: Location;
  desiredArrivalTime: string;
  maxOccupancy: number;
  preference?: "default" | "costPriority" | "comfortPriority";
};

// 1. UPDATED TYPE DEFINITION
export type DriverProfile = {
  id: string;
  name: string; // <--- New
  city: string;
  program: string; // <--- New
  vehicle: string; // <--- New
  bio: string; // <--- New
  profilePic: string; // <--- New
  rating: number; // <--- New
  origin: Location;
  destination: Location;
  plannedArrivalTime: string;
  detourToleranceMinutes: number;
  maxPassengers: number;
  currentPassengers: number;
};

// 2. UPDATED DATA WITH PERSONAL DETAILS
export const hardcodedDrivers: DriverProfile[] = [
  {
    id: "driver-1",
    name: "Sarah Jenkins",
    city: "Hamilton (McMaster)",
    program: "Civil Engineering, 4th Year",
    vehicle: "Honda Civic (Grey)",
    bio: "Commuting every day for 8:30 classes. Quiet rides mostly but happy to chat!",
    profilePic: "https://i.pravatar.cc/150?u=driver-1",
    rating: 4.9,
    origin: { lat: 43.25, lng: -79.92 },
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:50",
    detourToleranceMinutes: 10,
    maxPassengers: 3,
    currentPassengers: 0,
  },
  {
    id: "driver-2",
    name: "David Chen",
    city: "Downtown Hamilton",
    program: "Health Sciences, 3rd Year",
    vehicle: "Toyota RAV4 (Blue)",
    bio: "I usually listen to podcasts. Plenty of trunk space if you have gym gear.",
    profilePic: "https://i.pravatar.cc/150?u=driver-2",
    rating: 4.7,
    origin: { lat: 43.2381, lng: -79.8891 },
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:30",
    detourToleranceMinutes: 5,
    maxPassengers: 2,
    currentPassengers: 1,
  },
  {
    id: "driver-35",
    name: "Michael Ross",
    city: "Ancaster Meadowlands",
    program: "Business (MBA)",
    vehicle: "Tesla Model 3 (White)",
    bio: "Reliable and punctual. I leave exactly on time.",
    profilePic: "https://i.pravatar.cc/150?u=driver-35",
    rating: 5.0,
    origin: { lat: 43.2, lng: -79.91 },
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:35",
    detourToleranceMinutes: 8,
    maxPassengers: 3,
    currentPassengers: 1,
  },
  // ... (You can update the rest similarly, or just use these 3 for the demo)
];

// ... (Keep the rest of the file logic the same) ...

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
  detourTimeSeconds: number,
  toleranceMinutes: number
): number {
  const toleranceSeconds = toleranceMinutes * 60;

  if (detourTimeSeconds <= toleranceSeconds) {
    return 1.0;
  }

  const excessTime = detourTimeSeconds - toleranceSeconds;

  // Tunable constant: -0.005 means the score drops to ~36% after ~3.3 minutes (200s) of excess detour.
  const decayRate = -0.005;

  const score = Math.exp(decayRate * excessTime);

  return Math.max(0.01, score);
}

function calculateEstimatedCost(
  distanceKm: number,
  durationSeconds: number,
  existingPassengers: number
): number {
  const durationMinutes = durationSeconds / 60;

  const fullRideCost =
    PLATFORM_BASE_FARE +
    distanceKm * PLATFORM_RATE_PER_KM +
    durationMinutes * PLATFORM_RATE_PER_MINUTE;

  const discountTier = Math.min(
    existingPassengers,
    3
  ) as keyof typeof COST_DISCOUNT_TIERS;
  const discountPercentage = COST_DISCOUNT_TIERS[discountTier];

  const finalCost = fullRideCost * (1 - discountPercentage);

  return Math.round(finalCost * 100) / 100;
}

function calculateCostScore(estimatedCost: number, minCost: number): number {
  const costDifference = estimatedCost - minCost;

  if (costDifference <= 0) {
    return 1.0;
  }
  const decayRate = 0.1;
  const score = Math.exp(-decayRate * costDifference);

  return score;
}

function calculateComfortScore(
  currentPassengers: number,
  maxPassengers: number,
  riderMaxOccupancy: number
): number {
  const newTotalOccupancy = currentPassengers + 1;

  // Hard fail: Driver's car is full
  if (newTotalOccupancy > maxPassengers) {
    return 0.0;
  }

  // Hard fail: Rider is not comfortable with this many people
  if (newTotalOccupancy > riderMaxOccupancy) {
    return 0.0;
  }

  const score = 1.0 - newTotalOccupancy / (maxPassengers + 1);

  return Math.max(0, Math.min(1, score));
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function findAndRankMatches(rider: RiderProfile) {
  const preliminaryDataPromises = hardcodedDrivers.map(async (driver) => {
    const { detourTimeInSeconds, rideDistanceKm, rideDurationSeconds } =
      await getDetourAndRideDetails(driver, rider);

    const estimatedCost = calculateEstimatedCost(
      rideDistanceKm,
      rideDurationSeconds,
      driver.currentPassengers
    );

    return {
      driver,
      detourTimeInSeconds,
      estimatedCost,
      scheduleScore: calculateScheduleScore(
        rider.desiredArrivalTime,
        driver.plannedArrivalTime
      ),
      locationScore: calculateLocationScore(
        detourTimeInSeconds,
        driver.detourToleranceMinutes
      ),
      comfortScore: calculateComfortScore(
        driver.currentPassengers,
        driver.maxPassengers,
        rider.maxOccupancy
      ),
    };
  });

  const preliminaryData = await Promise.all(preliminaryDataPromises);

  const allCosts = preliminaryData.map((d) => d.estimatedCost);
  const minCost = Math.min(...allCosts);

  const scoredDrivers = preliminaryData.map((data) => {
    const costScore = calculateCostScore(data.estimatedCost, minCost);

    //NEW
    const selectedPreset = WEIGHT_PRESETS[rider.preference ?? "default"];
    //NEW

    // Calculate the final total score using all our values
    // const totalScore =
    //  data.scheduleScore * GENERIC_WEIGHTS.schedule +
    //   data.locationScore * GENERIC_WEIGHTS.location +
    //   costScore * GENERIC_WEIGHTS.cost +
    // data.comfortScore * GENERIC_WEIGHTS.comfort;

    //NEW
    const totalScore =
      data.scheduleScore * selectedPreset.schedule +
      data.locationScore * selectedPreset.location +
      costScore * selectedPreset.cost +
      data.comfortScore * selectedPreset.comfort;
    //NEW
    const matchPercentage = Math.min(
      100,
      Math.round((totalScore / MAX_THEORETICAL_SCORE) * 100)
    );

    return {
      driverId: data.driver.id,
      driver: data.driver,
      totalScore,
      matchPercentage,
      scores: {
        schedule: data.scheduleScore,
        location: data.locationScore,
        cost: costScore,
        comfort: data.comfortScore,
      },
      details: {
        estimatedCost: data.estimatedCost,
        detourMinutes: data.detourTimeInSeconds / 60,
      },
    };
  });

  // Sort the final results
  const sortedDrivers = scoredDrivers.sort(
    (a, b) => b.totalScore - a.totalScore
  );

  return sortedDrivers;
}
