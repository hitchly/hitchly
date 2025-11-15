import { getDetourAndRideDetails } from "./googlemaps";

export type Location = {
  lat: number;
  lng: number;
};

const PLATFORM_BASE_FARE = 2.5;
const PLATFORM_RATE_PER_KM = 0.4;
const PLATFORM_RATE_PER_MINUTE = 0.2;

const GENERIC_WEIGHTS = {
  schedule: 2.0,
  location: 2.0,
  cost: 1.5,
  comfort: 0.5,
};

const COST_DISCOUNT_TIERS = {
  0: 0.0,
  1: 0.15,
  2: 0.25,
  3: 0.35,
};

export type RiderProfile = {
  id: string;
  origin: Location;
  destination: Location;
  desiredArrivalTime: string;

  maxOccupancy: number;
};

export type DriverProfile = {
  id: string;
  origin: Location;
  destination: Location;
  plannedArrivalTime: string;
  detourToleranceMinutes: number;

  maxPassengers: number;
  currentPassengers: number;
};

export const hardcodedDrivers: DriverProfile[] = [
  {
    id: "driver-1",
    origin: { lat: 43.25, lng: -79.92 }, // Hamilton, ON (near McMaster area)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:50",
    detourToleranceMinutes: 10,
    maxPassengers: 3,
    currentPassengers: 0,
  },
  {
    id: "driver-2",
    origin: { lat: 43.2381, lng: -79.8891 }, // Downtown Hamilton, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:30",
    detourToleranceMinutes: 5,
    maxPassengers: 2,
    currentPassengers: 1,
  },
  {
    id: "driver-3",
    origin: { lat: 43.31009, lng: -79.83965 }, // Dundas, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:00",
    detourToleranceMinutes: 15,
    maxPassengers: 5,
    currentPassengers: 4,
  },
  {
    id: "driver-4",
    origin: { lat: 43.3205, lng: -79.82787 }, // Waterdown, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "11:00",
    detourToleranceMinutes: 4,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-5",
    origin: { lat: 43.34768, lng: -79.77522 }, // Burlington, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "04:00",
    detourToleranceMinutes: 20,
    maxPassengers: 4,
    currentPassengers: 2,
  },
  {
    id: "driver-6",
    origin: { lat: 43.54736, lng: -79.59591 }, // Mississauga, ON (near Port Credit)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:20",
    detourToleranceMinutes: 23,
    maxPassengers: 4,
    currentPassengers: 2,
  },
  {
    id: "driver-7",
    origin: { lat: 43.58022, lng: -79.66507 }, // Mississauga, ON (Erin Mills area)
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "15:20",
    detourToleranceMinutes: 25,
    maxPassengers: 2,
    currentPassengers: 1,
  },
  {
    id: "driver-8",
    origin: { lat: 43.58111, lng: -79.95911 }, // Milton, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "16:20",
    detourToleranceMinutes: 15,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-9",
    origin: { lat: 43.15278, lng: -79.61796 }, // Grimsby, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "18:20",
    detourToleranceMinutes: 20,
    maxPassengers: 3,
    currentPassengers: 1,
  },
  {
    id: "driver-10",
    origin: { lat: 43.13844, lng: -80.27294 }, // Brantford, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "14:50",
    detourToleranceMinutes: 25,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-11",
    origin: { lat: 43.265, lng: -79.940 }, // West Hamilton, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:45",
    detourToleranceMinutes: 10,
    maxPassengers: 3,
    currentPassengers: 1,
  },
  {
    id: "driver-12",
    origin: { lat: 43.220, lng: -79.830 }, // Stoney Creek, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:10",
    detourToleranceMinutes: 12,
    maxPassengers: 4,
    currentPassengers: 2,
  },
  {
    id: "driver-13",
    origin: { lat: 43.190, lng: -79.950 }, // Ancaster, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:00",
    detourToleranceMinutes: 8,
    maxPassengers: 3,
    currentPassengers: 1,
  },
  {
    id: "driver-14",
    origin: { lat: 43.280, lng: -79.880 }, // Hamilton Mountain, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:20",
    detourToleranceMinutes: 6,
    maxPassengers: 2,
    currentPassengers: 0,
  },
  {
    id: "driver-15",
    origin: { lat: 43.320, lng: -79.790 }, // Burlington East, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:30",
    detourToleranceMinutes: 20,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-16",
    origin: { lat: 43.040, lng: -79.980 }, // Caledonia, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:15",
    detourToleranceMinutes: 25,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-17",
    origin: { lat: 43.145, lng: -79.720 }, // Beamsville, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:30",
    detourToleranceMinutes: 15,
    maxPassengers: 2,
    currentPassengers: 1,
  },
  {
    id: "driver-18",
    origin: { lat: 43.250, lng: -79.870 }, // Corktown, Hamilton, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:40",
    detourToleranceMinutes: 5,
    maxPassengers: 3,
    currentPassengers: 0,
  },
  {
    id: "driver-19",
    origin: { lat: 43.300, lng: -79.930 }, // Dundas Valley, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:50",
    detourToleranceMinutes: 10,
    maxPassengers: 4,
    currentPassengers: 2,
  },
  {
    id: "driver-20",
    origin: { lat: 43.350, lng: -79.790 }, // Aldershot, Burlington, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "11:00",
    detourToleranceMinutes: 12,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-21",
    origin: { lat: 43.500, lng: -79.700 }, // Oakville, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:55",
    detourToleranceMinutes: 15,
    maxPassengers: 2,
    currentPassengers: 0,
  },
  {
    id: "driver-22",
    origin: { lat: 43.575, lng: -79.630 }, // Mississauga City Centre, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:40",
    detourToleranceMinutes: 18,
    maxPassengers: 4,
    currentPassengers: 1,
  },
  {
    id: "driver-23",
    origin: { lat: 43.650, lng: -79.380 }, // Toronto Downtown, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:10",
    detourToleranceMinutes: 30,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-24",
    origin: { lat: 43.730, lng: -79.470 }, // North York, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:15",
    detourToleranceMinutes: 25,
    maxPassengers: 4,
    currentPassengers: 2,
  },
  {
    id: "driver-25",
    origin: { lat: 43.775, lng: -79.500 }, // Vaughan, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:05",
    detourToleranceMinutes: 22,
    maxPassengers: 3,
    currentPassengers: 1,
  },
  {
    id: "driver-26",
    origin: { lat: 43.540, lng: -79.870 }, // Milton, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:30",
    detourToleranceMinutes: 20,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-27",
    origin: { lat: 43.140, lng: -79.850 }, // Binbrook, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:25",
    detourToleranceMinutes: 15,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-28",
    origin: { lat: 43.220, lng: -79.770 }, // Winona, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:50",
    detourToleranceMinutes: 10,
    maxPassengers: 4,
    currentPassengers: 1,
  },
  {
    id: "driver-29",
    origin: { lat: 43.150, lng: -79.630 }, // Grimsby East, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:35",
    detourToleranceMinutes: 18,
    maxPassengers: 2,
    currentPassengers: 1,
  },
  {
    id: "driver-30",
    origin: { lat: 43.100, lng: -80.050 }, // Jerseyville, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:45",
    detourToleranceMinutes: 14,
    maxPassengers: 4,
    currentPassengers: 2,
  },
  {
    id: "driver-31",
    origin: { lat: 43.400, lng: -79.830 }, // East Burlington, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:40",
    detourToleranceMinutes: 9,
    maxPassengers: 3,
    currentPassengers: 1,
  },
  {
    id: "driver-32",
    origin: { lat: 43.560, lng: -79.700 }, // Mississauga (Erindale), ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:20",
    detourToleranceMinutes: 15,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-33",
    origin: { lat: 43.620, lng: -79.480 }, // Etobicoke, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "11:15",
    detourToleranceMinutes: 20,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-34",
    origin: { lat: 43.260, lng: -79.890 }, // Westdale, Hamilton, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:15",
    detourToleranceMinutes: 5,
    maxPassengers: 2,
    currentPassengers: 0,
  },
  {
    id: "driver-35",
    origin: { lat: 43.200, lng: -79.910 }, // Ancaster Meadowlands, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:35",
    detourToleranceMinutes: 8,
    maxPassengers: 3,
    currentPassengers: 1,
  },
  {
    id: "driver-36",
    origin: { lat: 43.340, lng: -79.930 }, // Waterdown, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:05",
    detourToleranceMinutes: 11,
    maxPassengers: 4,
    currentPassengers: 2,
  },
  {
    id: "driver-37",
    origin: { lat: 43.050, lng: -79.980 }, // Caledonia South, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "11:50",
    detourToleranceMinutes: 18,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-38",
    origin: { lat: 43.380, lng: -79.810 }, // Burlington Central, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:05",
    detourToleranceMinutes: 12,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-39",
    origin: { lat: 43.230, lng: -79.950 }, // Hamilton West, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:55",
    detourToleranceMinutes: 7,
    maxPassengers: 2,
    currentPassengers: 1,
  },
  {
    id: "driver-40",
    origin: { lat: 43.260, lng: -79.860 }, // Durand, Hamilton, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:30",
    detourToleranceMinutes: 10,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-41",
    origin: { lat: 43.510, lng: -79.640 }, // Oakville East, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:45",
    detourToleranceMinutes: 13,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-42",
    origin: { lat: 43.650, lng: -79.550 }, // Etobicoke South, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:55",
    detourToleranceMinutes: 20,
    maxPassengers: 4,
    currentPassengers: 2,
  },
  {
    id: "driver-43",
    origin: { lat: 43.705, lng: -79.390 }, // Midtown Toronto, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:25",
    detourToleranceMinutes: 25,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-44",
    origin: { lat: 43.780, lng: -79.320 }, // Scarborough, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:10",
    detourToleranceMinutes: 30,
    maxPassengers: 3,
    currentPassengers: 1,
  },
  {
    id: "driver-45",
    origin: { lat: 43.470, lng: -79.760 }, // Oakville West, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "10:25",
    detourToleranceMinutes: 15,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-46",
    origin: { lat: 43.180, lng: -79.700 }, // Beamsville, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:00",
    detourToleranceMinutes: 10,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-47",
    origin: { lat: 43.210, lng: -79.940 }, // Ancaster, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "09:35",
    detourToleranceMinutes: 8,
    maxPassengers: 4,
    currentPassengers: 3,
  },
  {
    id: "driver-48",
    origin: { lat: 43.250, lng: -79.910 }, // Hamilton West End, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "07:40",
    detourToleranceMinutes: 6,
    maxPassengers: 2,
    currentPassengers: 1,
  },
  {
    id: "driver-49",
    origin: { lat: 43.300, lng: -79.800 }, // Burlington East, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "08:25",
    detourToleranceMinutes: 15,
    maxPassengers: 3,
    currentPassengers: 2,
  },
  {
    id: "driver-50",
    origin: { lat: 43.600, lng: -79.680 }, // Mississauga West, ON
    destination: { lat: 43.2609, lng: -79.9192 },
    plannedArrivalTime: "11:45",
    detourToleranceMinutes: 18,
    maxPassengers: 4,
    currentPassengers: 3,
  },

  
];



function calculateScheduleScore(riderTime: string, driverTime: string): number {
  const tRider = timeToMinutes(riderTime);
  const tDriver = timeToMinutes(driverTime);
  const timeDiff = tDriver - tRider;

  if (timeDiff >= 0 && timeDiff <= 10) return 1.0;
  if (timeDiff > 10) return Math.max(0, 1.0 - (timeDiff - 10) / 30);
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

    // Calculate the final total score using all our values
    const totalScore =
      data.scheduleScore * GENERIC_WEIGHTS.schedule +
      data.locationScore * GENERIC_WEIGHTS.location +
      costScore * GENERIC_WEIGHTS.cost +
      data.comfortScore * GENERIC_WEIGHTS.comfort;

    return {
      driverId: data.driver.id,
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
