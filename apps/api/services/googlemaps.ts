import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env";

export type Location = {
  lat: number;
  lng: number;
};

export type DriverRouteInfo = {
  origin: Location;
  destination: Location;
  existingWaypoints: Location[];
  departureTime?: Date;
};

export type NewRiderInfo = {
  origin: Location;
  destination: Location;
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
  const now = Math.floor(Date.now() / 1000);
  const departureSecs = Math.floor(departureTime.getTime() / 1000);
  const safeDepTime = Math.max(departureSecs, now + 60);

  const params: any = {
    origin: toGoogleLatLng(origin),
    destination: toGoogleLatLng(destination),
    key: env.google.apiKey,
    departure_time: safeDepTime,
  };

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
    throw error;
  }
}

export async function getDetourAndRideDetails(
  driverTrip: DriverRouteInfo,
  rider: NewRiderInfo
) {
  const departureTime = driverTrip.departureTime || new Date();

  const baselineRoute = await getRouteDetails(
    driverTrip.origin,
    driverTrip.destination,
    driverTrip.existingWaypoints,
    departureTime,
    true // Optimize the existing stops too
  );

  const allWaypoints = [...driverTrip.existingWaypoints, rider.origin];

  const newRoute = await getRouteDetails(
    driverTrip.origin,
    driverTrip.destination,
    allWaypoints,
    departureTime,
    true
  );

  const detourTimeInSeconds =
    newRoute.totalDurationSeconds - baselineRoute.totalDurationSeconds;

  const riderRoute = await getRouteDetails(
    rider.origin,
    driverTrip.destination,
    [],
    departureTime,
    false
  );

  const rideDistanceKm = riderRoute.totalDistanceMeters / 1000;

  const rideDurationSeconds = riderRoute.totalDurationSeconds;

  return {
    detourTimeInSeconds: Math.max(0, detourTimeInSeconds),
    rideDistanceKm: rideDistanceKm,
    rideDurationSeconds: rideDurationSeconds,
  };
}
