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

  const departureTime = new Date(targetArrivalTime.getTime());
  departureTime.setHours(departureTime.getHours() - 1);

  const originalRoute = await getRouteDetails(
    driver.origin,
    driver.destination,
    driver.routeWaypoints,
    departureTime,
  );

  const newWaypoints = [rider.origin, ...driver.routeWaypoints];
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
    [...driver.routeWaypoints],
    departureTime,
  );
  const rideDistanceKm = riderRoute.totalDistanceMeters / 1000;
  const rideDurationSeconds = riderRoute.totalDurationSeconds;

  return {
    detourTimeInSeconds: Math.max(0, detourTimeInSeconds), // Ensure no negative detour
    rideDistanceKm: rideDistanceKm,
    rideDurationSeconds: rideDurationSeconds,
  };
}
