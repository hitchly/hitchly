import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env";

// We define local types here to avoid circular dependencies with matchmaking
export type Location = {
  lat: number;
  lng: number;
};

// The generic shape of a trip we want to analyze
export type DriverRouteInfo = {
  origin: Location; // Where the car is STARTING (Home or Current GPS)
  destination: Location; // The Final Drop-off (Campus)
  existingWaypoints: Location[]; // Stops for riders ALREADY booked
  departureTime?: Date; // When they leave (or now)
};

export type NewRiderInfo = {
  origin: Location;
  destination: Location; // Usually same as driver's dest, but good to have
};

const mapsClient = new Client({});

const toGoogleLatLng = (loc: Location) => ({
  lat: loc.lat,
  lng: loc.lng,
});

async function getRouteDetails(
  origin: Location,
  destination: Location,
  waypoints: Location[] = [],
  departureTime: Date = new Date(),
  optimize: boolean = false
) {
  // Google Maps API expects departure_time as Unix timestamp in seconds
  // Also ensure it's in the future (at least 1 minute from now)
  const now = Math.floor(Date.now() / 1000);
  const departureSecs = Math.floor(departureTime.getTime() / 1000);
  const safeDepTime = Math.max(departureSecs, now + 60);

  // Build params - only include optimize if we have waypoints
  const params: any = {
    origin: toGoogleLatLng(origin),
    destination: toGoogleLatLng(destination),
    key: env.google.apiKey,
    departure_time: safeDepTime,
  };

  // Only add waypoints and optimize if we have waypoints
  if (waypoints.length > 0) {
    params.waypoints = waypoints.map(toGoogleLatLng);
    if (optimize) {
      params.optimize = true;
    }
  }

  try {
    const response = await mapsClient.directions({ params });

    const route = response.data.routes[0];
    if (!route) throw new Error("No route found");

    let totalDurationSeconds = 0;
    let totalDistanceMeters = 0;

    for (const leg of route.legs) {
      totalDurationSeconds += leg.duration.value;
      totalDistanceMeters += leg.distance.value;
    }

    return {
      totalDurationSeconds,
      totalDistanceMeters,
      waypointOrder: route.waypoint_order || [],
    };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const responseData = error?.response?.data;
    console.error(`Google Maps API Error: ${errorMsg}`);
    console.error(
      `  Request: origin=(${origin.lat},${origin.lng}) dest=(${destination.lat},${destination.lng}) waypoints=${waypoints.length}`
    );
    if (responseData) {
      console.error(`  Response: ${JSON.stringify(responseData)}`);
    }
    throw error; // Re-throw so caller knows it failed
  }
}

export async function getDetourAndRideDetails(
  driverTrip: DriverRouteInfo,
  rider: NewRiderInfo
) {
  // 1. Establish Departure Time
  // If the driver set a specific time, use it. Otherwise use now.
  const departureTime = driverTrip.departureTime || new Date();

  // 2. Calculate BASELINE (Driver + Existing Passengers)
  // We need to know how long the trip takes BEFORE adding the new guy.
  const baselineRoute = await getRouteDetails(
    driverTrip.origin,
    driverTrip.destination,
    driverTrip.existingWaypoints,
    departureTime,
    true // Optimize the existing stops too
  );

  // 3. Calculate NEW REALITY (Driver + Existing + New Rider)
  // We add the new rider's origin to the list of stops
  const allWaypoints = [...driverTrip.existingWaypoints, rider.origin];

  const newRoute = await getRouteDetails(
    driverTrip.origin,
    driverTrip.destination,
    allWaypoints,
    departureTime,
    true // <--- CRITICAL: Optimize the order (TSP Solver)
  );

  // 4. Calculate Detour
  // Detour is the EXTRA time added to the total trip
  const detourTimeInSeconds =
    newRoute.totalDurationSeconds - baselineRoute.totalDurationSeconds;

  // 5. Calculate Rider's Specific Trip Details
  // Distance from Rider Origin -> Destination (Campus)
  // This is used for PRICING the rider.
  const riderRoute = await getRouteDetails(
    rider.origin,
    driverTrip.destination,
    [],
    departureTime,
    false // Direct route, no waypoints
  );

  const rideDistanceKm = riderRoute.totalDistanceMeters / 1000;

  // Note: rideDurationSeconds is how long the RIDER sits in the car.
  // We approximate this using their direct route duration.
  // (Technically it might be longer if the driver makes stops AFTER picking them up,
  // but for pricing, using the direct duration is standard/fair).
  const rideDurationSeconds = riderRoute.totalDurationSeconds;

  return {
    detourTimeInSeconds: Math.max(0, detourTimeInSeconds),
    rideDistanceKm: rideDistanceKm,
    rideDurationSeconds: rideDurationSeconds,
    // Optional: You could return newRoute.waypointOrder here if you wanted to
    // tell the driver "Go to Hamilton first"
  };
}
