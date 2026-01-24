import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env";

// Verify API key is loaded at startup
if (!env.google.apiKey) {
  console.error(
    "ERROR: GOOGLE_MAPS_API_KEY is not set in environment variables!"
  );
} else {
  console.log(
    `Google Maps API Key loaded: ${env.google.apiKey.substring(0, 10)}...`
  );
}

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

export async function geocodeAddress(
  address: string
): Promise<Location | null> {
  // #region agent log - declare LOG_ENDPOINT at function scope
  const LOG_ENDPOINT =
    "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9";
  // #endregion agent log

  try {
    const apiKey = env.google.apiKey;
    // #region agent log
    fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "googlemaps.ts:86",
        message: "Geocoding address",
        data: {
          address,
          apiKeySet: !!apiKey,
          apiKeyLength: apiKey?.length ?? 0,
          apiKeyPrefix: apiKey?.substring(0, 10) ?? "none",
          expectedKey: "AIzaSyC0BL",
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "I",
      }),
    }).catch(() => {});
    // #endregion agent log

    const response = await mapsClient.geocode({
      params: {
        address,
        key: apiKey,
      },
    });

    if (response.data.results.length === 0) {
      // #region agent log
      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "googlemaps.ts:130",
          message: "Geocoding returned no results",
          data: {
            address,
            status: response.status,
            statusText: response.statusText,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: "I",
        }),
      }).catch(() => {});
      // #endregion agent log
      throw new Error(`No results found for address: ${address}`);
    }

    const location = response.data.results[0].geometry.location;
    // #region agent log
    fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "googlemaps.ts:134",
        message: "Geocoding succeeded",
        data: {
          address,
          location,
          status: response.status,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "I",
      }),
    }).catch(() => {});
    // #endregion agent log
    return {
      lat: location.lat,
      lng: location.lng,
    };
  } catch (error: any) {
    // #region agent log
    fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "googlemaps.ts:139",
        message: "Geocoding error caught",
        data: {
          address,
          errorMessage: error?.message || String(error),
          errorCode: error?.response?.status,
          errorData: error?.response?.data,
          errorStatus: error?.response?.statusText,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "I",
      }),
    }).catch(() => {});
    // #endregion agent log

    // If geocoding API is not enabled (403), return null gracefully instead of throwing
    // This allows the system to work without geocoding API (trips from trips table will be skipped)
    const isApiNotEnabled =
      error?.response?.status === 403 ||
      error?.response?.data?.status === "REQUEST_DENIED";

    if (isApiNotEnabled) {
      console.warn(
        `Geocoding API not enabled - skipping address "${address}". Trips from trips table will not appear until geocoding API is enabled.`
      );
      // Return null to signal that geocoding failed, but don't throw
      // The matchmaking service will filter out null values
      return null;
    }

    console.error(`Geocoding error for address "${address}":`, error);
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
