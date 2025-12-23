import { getDetourAndRideDetails } from "./googlemaps";

export type Location = {
  lat: number;
  lng: number;
};

const PLATFORM_BASE_FARE = 2.5;
const PLATFORM_RATE_PER_KM = 0.2;
const PLATFORM_RATE_PER_MINUTE = 0.1;

const GENERIC_WEIGHTS = {
  schedule: 2.0,
  location: 2.0,
  cost: 1.5,
  comfort: 0.5,
};

//NEW
const WEIGHT_PRESETS = {
  default: {
    schedule: 2.0,
    location: 2.0,
    cost: 1.5,
    comfort: 0.5,
  },

  costPriority: {
    schedule: 2.0,
    location: 2.0,
    cost: 1.75,
    comfort: 0.1,
  },

  comfortPriority: {
    schedule: 2.0,
    location: 2.0,
    cost: 1.0,
    comfort: 1.0,
  },
};
//NEW

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
  //NEW
  preference?: "default" | "costPriority" | "comfortPriority";
  //NEW
};

export type DriverProfile = {
  id: string;
  city: string;
  origin: Location;
  destination: Location;
  plannedArrivalTime: string;
  detourToleranceMinutes: number;

  maxPassengers: number;
  currentPassengers: number;
};

export const hardcodedDrivers: DriverProfile[] = [
  // --- Local Hamilton Matches (For Rider 1 & 21) ---
  {
    id: "driver-1",
    city: "Hamilton McMaster Area",
    origin: { lat: 43.25, lng: -79.92 }, // Hamilton (McMaster area)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:50",
    detourToleranceMinutes: 10,
    maxPassengers: 3,
    currentPassengers: 0,
  },
  {
    id: "driver-2",
    city: "Downtown Hamilton",
    origin: { lat: 43.2381, lng: -79.8891 }, // Downtown Hamilton
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:30",
    detourToleranceMinutes: 5,
    maxPassengers: 2,
    currentPassengers: 1,
  },
  {
    id: "driver-35",
    city: "Ancaster Meadowlands",
    origin: { lat: 43.2, lng: -79.91 }, // Ancaster Meadowlands (Perfect for Rider 21)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:35",
    detourToleranceMinutes: 8,
    maxPassengers: 3,
    currentPassengers: 1,
  },

  // --- Stoney Creek / Mountain (For Rider 6) ---
  {
    id: "driver-14",
    city: "Hamilton Mountain",
    origin: { lat: 43.28, lng: -79.88 }, // Hamilton Mountain (Close to Stoney Creek)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:20",
    detourToleranceMinutes: 6,
    maxPassengers: 2,
    currentPassengers: 0,
  },
  {
    id: "driver-12",
    city: "Stoney Creek",
    origin: { lat: 43.22, lng: -79.83 }, // Stoney Creek
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:10",
    detourToleranceMinutes: 12,
    maxPassengers: 4,
    currentPassengers: 2,
  },

  // --- Long Distance East (For Rider 23) ---
  {
    id: "driver-17",
    city: "Beamsville",
    origin: { lat: 43.145, lng: -79.72 }, // Beamsville (Perfect for Rider 23)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:45",
    detourToleranceMinutes: 15,
    maxPassengers: 2,
    currentPassengers: 1,
  },
  {
    id: "driver-9",
    city: "Grimsby",
    origin: { lat: 43.15278, lng: -79.61796 }, // Grimsby
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:00",
    detourToleranceMinutes: 20,
    maxPassengers: 3,
    currentPassengers: 1,
  },

  // --- GTA / Toronto (For Rider 14, 13, 9) ---
  {
    id: "driver-22",
    city: "Mississauga",
    origin: { lat: 43.575, lng: -79.63 }, // Mississauga City Centre (Perfect for Rider 13 & 9)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:40",
    detourToleranceMinutes: 18,
    maxPassengers: 4,
    currentPassengers: 1,
  },
  {
    id: "driver-23",
    city: "Toronto Downtown",
    origin: { lat: 43.65, lng: -79.38 }, // Toronto Downtown (Match for Rider 14)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:10",
    detourToleranceMinutes: 30,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-43",
    city: "Toronto Midtown",
    origin: { lat: 43.705, lng: -79.39 }, // Midtown Toronto (Better time for Rider 14)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:25",
    detourToleranceMinutes: 25,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-21",
    city: "Oakville",
    origin: { lat: 43.5, lng: -79.7 }, // Oakville
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:55",
    detourToleranceMinutes: 15,
    maxPassengers: 2,
    currentPassengers: 0,
  },

  // --- Variety / Edge Cases ---
  {
    id: "driver-3",
    city: "Dundas",
    origin: { lat: 43.31009, lng: -79.83965 }, // Dundas
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:00",
    detourToleranceMinutes: 15,
    maxPassengers: 5,
    currentPassengers: 4,
  },
  {
    id: "driver-4",
    city: "Waterdown",
    origin: { lat: 43.3205, lng: -79.82787 }, // Waterdown
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "11:00",
    detourToleranceMinutes: 4,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-10",
    city: "Brantford West",
    origin: { lat: 43.13844, lng: -80.27294 }, // Brantford (West)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "14:50",
    detourToleranceMinutes: 25,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-8",
    city: "Milton North",
    origin: { lat: 43.58111, lng: -79.95911 }, // Milton (North)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "16:20",
    detourToleranceMinutes: 15,
    maxPassengers: 4,
    currentPassengers: 3,
  },
];

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
  toleranceMinutes: number,
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
  existingPassengers: number,
): number {
  const durationMinutes = durationSeconds / 60;

  const fullRideCost =
    PLATFORM_BASE_FARE +
    distanceKm * PLATFORM_RATE_PER_KM +
    durationMinutes * PLATFORM_RATE_PER_MINUTE;

  const discountTier = Math.min(
    existingPassengers,
    3,
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
  riderMaxOccupancy: number,
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
      driver.currentPassengers,
    );

    return {
      driver,
      detourTimeInSeconds,
      estimatedCost,
      scheduleScore: calculateScheduleScore(
        rider.desiredArrivalTime,
        driver.plannedArrivalTime,
      ),
      locationScore: calculateLocationScore(
        detourTimeInSeconds,
        driver.detourToleranceMinutes,
      ),
      comfortScore: calculateComfortScore(
        driver.currentPassengers,
        driver.maxPassengers,
        rider.maxOccupancy,
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

    return {
      driverId: data.driver.id,
      driver: data.driver,
      totalScore,
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
    (a, b) => b.totalScore - a.totalScore,
  );

  return sortedDrivers;
}
