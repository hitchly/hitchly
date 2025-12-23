import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env";
import {
  type DriverProfile,
  type Location,
  type RiderProfile,
} from "./matchmaking_service";

const mapsClient = new Client({});

const toGoogleLatLng = (loc: Location) => ({
  lat: loc.lat,
  lng: loc.lng,
});

function getFutureDateTime(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const now = new Date();
  const targetTime = new Date();

  targetTime.setHours(hours, minutes, 0, 0);

  if (now.getTime() > targetTime.getTime()) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  return targetTime;
}

async function getRouteDetails(
  origin: Location,
  destination: Location,
  waypoints: Location[] = [],
  departureTime: Date,
) {
  try {
    const response = await mapsClient.directions({
      params: {
        origin: toGoogleLatLng(origin),
        destination: toGoogleLatLng(destination),
        waypoints: waypoints.map(toGoogleLatLng),
        key: env.google.apiKey,
        departure_time: departureTime,
      },
    });

    const route = response.data.routes[0];
    if (!route) throw new Error("No route found");

    let totalDurationSeconds = 0;
    let totalDistanceMeters = 0;

    for (const leg of route.legs) {
      totalDurationSeconds += leg.duration.value;
      totalDistanceMeters += leg.distance.value;
    }

    return { totalDurationSeconds, totalDistanceMeters };
  } catch (error) {
    console.error("Google Maps API Error:", error);
    return { totalDurationSeconds: 999999, totalDistanceMeters: 9999999 };
  }
}

export async function getDetourAndRideDetails(
  driver: DriverProfile,
  rider: RiderProfile,
) {
  const targetArrivalTime = getFutureDateTime(driver.plannedArrivalTime);

  const predictiveDepartureTime = new Date(targetArrivalTime.getTime());
  predictiveDepartureTime.setHours(predictiveDepartureTime.getHours() - 1);

  const now = new Date();

  const departureTime = new Date(
    Math.max(predictiveDepartureTime.getTime(), now.getTime()),
  );

  const originalRoute = await getRouteDetails(
    driver.origin,
    driver.destination,
    [],
    departureTime,
  );

  const newWaypoints = [rider.origin];
  const newRoute = await getRouteDetails(
    driver.origin,
    driver.destination,
    newWaypoints,
    departureTime,
  );

  const detourTimeInSeconds =
    newRoute.totalDurationSeconds - originalRoute.totalDurationSeconds;

  const riderRoute = await getRouteDetails(
    rider.origin,
    driver.destination,
    [],
    departureTime,
  );
  const rideDistanceKm = riderRoute.totalDistanceMeters / 1000;
  const rideDurationSeconds = riderRoute.totalDurationSeconds;

  // console.group(`\n--- [Debug] Detour for Driver: ${driver.id} ---`);
  // console.log(`Rider ID: ${rider.id}`);
  // console.log(`Departure Time Used: ${predictiveDepartureTime.toISOString()}`);
  // console.log(
  //   `Original Time (Driver Only): ${(originalRoute.totalDurationSeconds / 60).toFixed(2)} mins`,
  // );
  // console.log(
  //   `New Time (With Pickup):     ${(newRoute.totalDurationSeconds / 60).toFixed(2)} mins`,
  // );
  // console.log(
  //   `Calculated Detour:        ${(detourTimeInSeconds / 60).toFixed(2)} mins`,
  // );

  return {
    detourTimeInSeconds: Math.max(0, detourTimeInSeconds), // Ensure no negative detour
    rideDistanceKm: rideDistanceKm,
    rideDurationSeconds: rideDurationSeconds,
  };
}
