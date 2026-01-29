import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env";
import { db, eq, and, gte } from "@hitchly/db/client";
import { routes } from "@hitchly/db/schema";

// Verify API key is loaded at startup
if (!env.google.apiKey) {
  console.error(
    "ERROR: GOOGLE_MAPS_API_KEY is not set in environment variables!"
  );
} else {
  // API key loaded successfully
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

export async function getRouteDetails(
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

      // Check for legacy API error
      if (
        responseData.error_message?.includes("legacy API") ||
        responseData.error_message?.includes("LegacyApiNotActivated")
      ) {
        console.error(
          `\n⚠️  Directions API (Legacy) is not enabled. Please enable it at:\n` +
            `   https://console.cloud.google.com/apis/library/directions-backend.googleapis.com\n` +
            `   Or migrate to Routes API for better features.`
        );
      }
    }
    throw error;
  }
}

export async function geocodeAddress(
  address: string
): Promise<Location | null> {
  try {
    const apiKey = env.google.apiKey;

    const response = await mapsClient.geocode({
      params: {
        address,
        key: apiKey,
      },
    });

    if (response.data.results.length === 0) {
      throw new Error(`No results found for address: ${address}`);
    }

    const location = response.data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng,
    };
  } catch (error: any) {
    const errorData = error?.response?.data;
    const errorMessage = error?.message || String(error);
    const errorStatus = error?.response?.status;

    // Check for various API-related errors
    const errorMsg = errorData?.error_message || errorMessage || "";
    const isApiNotEnabled =
      errorStatus === 403 ||
      errorData?.status === "REQUEST_DENIED" ||
      errorMsg.includes("not activated") ||
      errorMsg.includes("API is not enabled") ||
      errorMsg.includes("not authorized to use this service") ||
      errorMsg.includes("API restrictions settings");

    if (isApiNotEnabled) {
      // Log the specific error for debugging
      console.warn(`Geocoding API error for address "${address}": ${errorMsg}`);
      // Return null so the caller can handle it appropriately
      return null;
    }

    // Log other errors but still throw them
    console.error(`Geocoding error for address "${address}":`, {
      status: errorStatus,
      message: errorMessage,
      data: errorData,
    });
    throw error;
  }
}

export async function getDetourAndRideDetails(
  driverTrip: DriverRouteInfo,
  rider: NewRiderInfo
) {
  try {
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
  } catch (error) {
    console.error("Error in getDetourAndRideDetails:", error);
    // Return safe defaults instead of throwing
    return {
      detourTimeInSeconds: 0,
      rideDistanceKm: 0,
      rideDurationSeconds: 0,
    };
  }
}

// Cache expiry time (24 hours in milliseconds)
const ROUTE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generate a cache key for route caching
 * Rounds coordinates to 4 decimal places (~11m precision) for better cache hits
 */
function generateRouteCacheKey(
  origin: Location,
  destination: Location,
  waypoints: Location[] = []
): string {
  const round = (n: number) => n.toFixed(4);
  const originStr = `${round(origin.lat)},${round(origin.lng)}`;
  const destStr = `${round(destination.lat)},${round(destination.lng)}`;
  const waypointsStr = waypoints
    .map((w) => `${round(w.lat)},${round(w.lng)}`)
    .sort()
    .join("|");
  return `${originStr}->${destStr}${waypointsStr ? `|${waypointsStr}` : ""}`;
}

export type TripDistanceResult = {
  distanceKm: number;
  durationSeconds: number;
} | null;

/**
 * Calculate trip distance with route caching
 * Checks cache first, calls Google Maps API if cache miss, and stores result
 */
export async function calculateTripDistance(
  origin: Location,
  destination: Location,
  waypoints: Location[] = []
): Promise<TripDistanceResult> {
  try {
    const cacheKey = generateRouteCacheKey(origin, destination, waypoints);
    const twentyFourHoursAgo = new Date(Date.now() - ROUTE_CACHE_TTL_MS);

    // Check cache first
    const cached = await db.query.routes.findFirst({
      where: and(
        eq(routes.id, cacheKey),
        gte(routes.cachedAt, twentyFourHoursAgo)
      ),
    });

    if (cached && cached.distance && cached.duration) {
      return {
        distanceKm: parseFloat(cached.distance),
        durationSeconds: cached.duration * 60,
      };
    }

    // Cache miss - call Google Maps API
    const result = await getRouteDetails(origin, destination, waypoints);

    const distanceKm = result.totalDistanceMeters / 1000;
    const durationMinutes = Math.round(result.totalDurationSeconds / 60);

    // Store in cache (upsert)
    await db
      .insert(routes)
      .values({
        id: cacheKey,
        origin: JSON.stringify(origin),
        destination: JSON.stringify(destination),
        distance: distanceKm.toFixed(2),
        duration: durationMinutes,
        cachedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: routes.id,
        set: {
          distance: distanceKm.toFixed(2),
          duration: durationMinutes,
          cachedAt: new Date(),
        },
      });

    return {
      distanceKm,
      durationSeconds: result.totalDurationSeconds,
    };
  } catch (error) {
    console.error("Error calculating trip distance:", error);
    return null;
  }
}
