import { saveAddressSchema } from "@hitchly/db";
import { db } from "@hitchly/db/client";
import {
  profiles,
  tripRequests,
  trips,
  userLocations,
} from "@hitchly/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { calculateTripDistance } from "../../services/googlemaps";
import { capturePayment } from "../../services/payment";
import { protectedProcedure, router } from "../trpc";

const EARTH_RADIUS_KM = 6371;

// ETA throttling / cache controls
const ETA_RECOMPUTE_INTERVAL_MS = 30 * 1000; // only call Google at most once per 30s per key
const ETA_CACHE_MAX_AGE_MS = 2 * 60 * 1000; // mark ETA stale after 2 min

// Auto-state thresholds
const ARRIVAL_THRESHOLD_KM = 0.08; // ~80m for "arrived"
const AUTO_PICKUP_THRESHOLD_KM = 0.07; // ~70m for auto pickup confirmation
const AUTO_DROPOFF_THRESHOLD_KM = 0.1; // ~100m for auto dropoff completion
const LOCATION_STALENESS_THRESHOLD_MS = 15 * 1000; // 15 seconds

const etaCache = new Map<
  string,
  {
    durationSeconds: number | null;
    computedAtMs: number;
  }
>();

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeEtaCacheKey(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  const round = (n: number | string) =>
    (typeof n === "number" ? n : Number(n)).toFixed(4);
  return `${round(fromLat)},${round(fromLng)}->${round(toLat)},${round(toLng)}`;
}

async function getThrottledEta(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{
  etaSeconds: number | null;
  etaSource: "google" | "cache";
  etaComputedAt: string | null;
  etaStale: boolean;
}> {
  const cacheKey = makeEtaCacheKey(from.lat, from.lng, to.lat, to.lng);
  const nowMs = Date.now();
  const cached = etaCache.get(cacheKey);

  if (cached && nowMs - cached.computedAtMs < ETA_RECOMPUTE_INTERVAL_MS) {
    return {
      etaSeconds: cached.durationSeconds,
      etaSource: "cache",
      etaComputedAt: new Date(cached.computedAtMs).toISOString(),
      etaStale: nowMs - cached.computedAtMs > ETA_CACHE_MAX_AGE_MS,
    };
  }

  const etaResult = await calculateTripDistance(from, to);
  const etaSeconds = etaResult?.durationSeconds ?? null;

  etaCache.set(cacheKey, {
    durationSeconds: etaSeconds,
    computedAtMs: nowMs,
  });

  return {
    etaSeconds,
    etaSource: "google",
    etaComputedAt: new Date(nowMs).toISOString(),
    etaStale: false,
  };
}

async function syncTripStatus(tripId: string) {
  const [trip] = await db
    .select({
      id: trips.id,
      bookedSeats: trips.bookedSeats,
      status: trips.status,
    })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);

  if (!trip) return;

  const onTripRequests = await db
    .select({ id: tripRequests.id })
    .from(tripRequests)
    .where(
      and(eq(tripRequests.tripId, tripId), eq(tripRequests.status, "on_trip"))
    );

  if (onTripRequests.length !== trip.bookedSeats) {
    await db
      .update(trips)
      .set({
        bookedSeats: onTripRequests.length,
        updatedAt: new Date(),
      })
      .where(eq(trips.id, tripId));
  }

  const allRequests = await db
    .select({ id: tripRequests.id, status: tripRequests.status })
    .from(tripRequests)
    .where(eq(tripRequests.tripId, tripId));

  const allDone =
    allRequests.length > 0 &&
    allRequests.every((r) =>
      ["completed", "rejected", "cancelled"].includes(r.status)
    );

  if (allDone && trip.status !== "completed") {
    await db
      .update(trips)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(trips.id, tripId));
  }
}

/**
 * Shared logic to check and perform auto-pickup/dropoff for a request.
 */
async function performAutoStatusChecks(
  requestId: string,
  tripId: string,
  currentStatus: string,
  distanceKm: number,
  etaSeconds: number | null,
  alreadyConfirmed = false
): Promise<{ autoPickedUp: boolean; autoDroppedOff: boolean }> {
  let autoPickedUp = false;
  let autoDroppedOff = false;

  // Auto-Pickup Phase 1: Confirmation
  if (
    currentStatus === "accepted" &&
    !alreadyConfirmed &&
    (distanceKm <= AUTO_PICKUP_THRESHOLD_KM ||
      (etaSeconds !== null && etaSeconds <= 30))
  ) {
    await db
      .update(tripRequests)
      .set({
        riderPickupConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tripRequests.id, requestId));
    autoPickedUp = true;
    alreadyConfirmed = true;
  }

  // Auto-Pickup Phase 2: Start Trip (Fully Automatic transition)

  if (
    currentStatus === "accepted" &&
    alreadyConfirmed &&
    distanceKm <= AUTO_PICKUP_THRESHOLD_KM
  ) {
    await db
      .update(tripRequests)
      .set({
        status: "on_trip",
        updatedAt: new Date(),
      })
      .where(eq(tripRequests.id, requestId));

    await syncTripStatus(tripId);
  }

  // Auto-Dropoff
  if (
    currentStatus === "on_trip" &&
    (distanceKm <= AUTO_DROPOFF_THRESHOLD_KM ||
      (etaSeconds !== null && etaSeconds <= 30))
  ) {
    await db
      .update(tripRequests)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(tripRequests.id, requestId));
    autoDroppedOff = true;

    // Capture payment for the completed ride
    await capturePayment(requestId);

    await syncTripStatus(tripId);
  }

  return { autoPickedUp, autoDroppedOff };
}

export const locationRouter = router({
  update: protectedProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        heading: z.number().nullable().optional(),
        speed: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      await db
        .insert(userLocations)
        .values({
          userId: ctx.userId,
          latitude: input.latitude,
          longitude: input.longitude,
          heading: input.heading ?? null,
          speed: input.speed ?? null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userLocations.userId,
          set: {
            latitude: input.latitude,
            longitude: input.longitude,
            heading: input.heading ?? null,
            speed: input.speed ?? null,
            updatedAt: now,
          },
        });

      return { success: true, updatedAt: now };
    }),

  /**
   * Shared helper to calculate distance and ETA labels.
   */
  getDriverLiveStatus: protectedProcedure
    .input(
      z.object({
        tripId: z.string().min(1, "tripId is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      const [trip] = await db
        .select({
          id: trips.id,
          driverId: trips.driverId,
          originLat: trips.originLat,
          originLng: trips.originLng,
          destLat: trips.destLat,
          destLng: trips.destLng,
          status: trips.status,
        })
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) throw new Error("Trip not found");
      if (trip.driverId !== ctx.userId) throw new Error("Unauthorized");

      const [driverLocation] = await db
        .select({
          latitude: userLocations.latitude,
          longitude: userLocations.longitude,
          heading: userLocations.heading,
          speed: userLocations.speed,
          updatedAt: userLocations.updatedAt,
        })
        .from(userLocations)
        .where(eq(userLocations.userId, ctx.userId))
        .limit(1);

      if (!driverLocation) {
        return { hasLocation: false };
      }

      // Find the current "next" stop
      const requests = await db
        .select({
          id: tripRequests.id,
          status: tripRequests.status,
          pickupLat: tripRequests.pickupLat,
          pickupLng: tripRequests.pickupLng,
          dropoffLat: tripRequests.dropoffLat,
          dropoffLng: tripRequests.dropoffLng,
        })
        .from(tripRequests)
        .where(eq(tripRequests.tripId, input.tripId));

      let targetLat: number | null = null;
      let targetLng: number | null = null;
      let targetType: "pickup" | "dropoff" | null = null;

      const nextPickup = requests.find((r) => r.status === "accepted");
      if (nextPickup) {
        targetLat = nextPickup.pickupLat;
        targetLng = nextPickup.pickupLng;
        targetType = "pickup";
      } else {
        const nextDropoff = requests.find((r) => r.status === "on_trip");
        if (nextDropoff) {
          targetLat = nextDropoff.dropoffLat ?? trip.destLat;
          targetLng = nextDropoff.dropoffLng ?? trip.destLng;
          targetType = "dropoff";
        }
      }

      const isStale =
        Date.now() - new Date(driverLocation.updatedAt).getTime() >
        LOCATION_STALENESS_THRESHOLD_MS;

      if (!targetLat || !targetLng || !targetType) {
        return {
          hasLocation: true,
          isLocationStale: isStale,
          driverLocation,
          targetType: null,
        };
      }

      const targetDistanceKm = haversineDistanceKm(
        { lat: driverLocation.latitude, lng: driverLocation.longitude },
        { lat: targetLat, lng: targetLng }
      );

      const {
        etaSeconds: targetEtaSeconds,
        etaSource,
        etaComputedAt,
        etaStale,
      } = await getThrottledEta(
        { lat: driverLocation.latitude, lng: driverLocation.longitude },
        { lat: targetLat, lng: targetLng }
      );

      let autoPickedUpCount = 0;
      let autoDroppedOffCount = 0;

      const activeStops = requests.filter(
        (r) => r.status === "accepted" || r.status === "on_trip"
      );
      for (const req of activeStops) {
        // Calculate distance for this specific request if it wasn't the "main" target
        const reqLat =
          req.status === "accepted"
            ? req.pickupLat
            : (req.dropoffLat ?? trip.destLat);
        const reqLng =
          req.status === "accepted"
            ? req.pickupLng
            : (req.dropoffLng ?? trip.destLng);

        if (!reqLat || !reqLng) continue;

        const dist =
          reqLat === targetLat && reqLng === targetLng
            ? targetDistanceKm
            : haversineDistanceKm(
                { lat: driverLocation.latitude, lng: driverLocation.longitude },
                { lat: reqLat, lng: reqLng }
              );

        // We use a looser ETA check for secondary stops to avoid over-calling Google
        const { autoPickedUp, autoDroppedOff } = await performAutoStatusChecks(
          req.id,
          trip.id,
          req.status,
          dist,
          reqLat === targetLat ? targetEtaSeconds : null, // only use Google ETA for main target
          false
        );

        if (autoPickedUp) autoPickedUpCount++;
        if (autoDroppedOff) autoDroppedOffCount++;
      }

      return {
        hasLocation: true,
        isLocationStale: isStale,
        targetType,
        targetDistanceKm,
        targetEtaSeconds,
        etaSource,
        etaComputedAt,
        etaStale,
        driverLocation,
        autoStatus: {
          pickedUp: autoPickedUpCount > 0,
          droppedOff: autoDroppedOffCount > 0,
        },
        tripStatus: trip.status,
        isStarted: trip.status === "in_progress",
      };
    }),

  /**
   * Rider-facing endpoint:
   * - Returns driver live location + distance/ETA
   * - Targets PICKUP while request is "accepted"
   * - Targets DROPOFF while request is "on_trip"
   * - Auto-confirms pickup
   * - Auto-completes dropoff + trip status/booked seats sync
   */
  getTripDriverLiveLocation: protectedProcedure
    .input(
      z.object({
        tripId: z.string().min(1, "tripId is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      const [trip] = await db
        .select({
          id: trips.id,
          driverId: trips.driverId,
          originLat: trips.originLat,
          originLng: trips.originLng,
          destLat: trips.destLat,
          destLng: trips.destLng,
          bookedSeats: trips.bookedSeats,
          status: trips.status,
        })
        .from(trips)
        .where(eq(trips.id, input.tripId))
        .limit(1);

      if (!trip) throw new Error("Trip not found");

      const requests = await db
        .select({
          id: tripRequests.id,
          riderId: tripRequests.riderId,
          pickupLat: tripRequests.pickupLat,
          pickupLng: tripRequests.pickupLng,
          dropoffLat: tripRequests.dropoffLat,
          dropoffLng: tripRequests.dropoffLng,
          status: tripRequests.status,
          riderPickupConfirmedAt: tripRequests.riderPickupConfirmedAt,
          createdAt: tripRequests.createdAt,
          updatedAt: tripRequests.updatedAt,
        })
        .from(tripRequests)
        .where(
          and(
            eq(tripRequests.tripId, input.tripId),
            eq(tripRequests.riderId, ctx.userId)
          )
        );

      const riderRequest =
        requests.find((r) => r.status === "on_trip") ??
        requests.find((r) => r.status === "accepted") ??
        requests
          .slice()
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];

      if (!riderRequest) {
        throw new Error("You do not have a request on this trip");
      }

      const [driverLocation] = await db
        .select({
          latitude: userLocations.latitude,
          longitude: userLocations.longitude,
          heading: userLocations.heading,
          speed: userLocations.speed,
          updatedAt: userLocations.updatedAt,
        })
        .from(userLocations)
        .where(eq(userLocations.userId, trip.driverId))
        .limit(1);

      if (!driverLocation) {
        return {
          hasLocation: false,
          target: riderRequest.status === "on_trip" ? "dropoff" : "pickup",
          targetLat: null,
          targetLng: null,
          targetDistanceKm: null,
          targetEtaSeconds: null,
          etaSource: "cache" as const,
          etaComputedAt: null,
          etaStale: true,
          hasArrivedAtTarget: false,
          hasArrivedAtPickup: false,
          hasArrivedAtDropoff: false,
          autoPickupEligible: false,
          autoPickedUp: false,
          autoDropoffEligible: false,
          autoDroppedOff: false,
          requestStatus: riderRequest.status,
          driverLocation: null,
        };
      }

      const targetType =
        riderRequest.status === "on_trip" ? "dropoff" : "pickup";

      const targetLat =
        targetType === "pickup"
          ? riderRequest.pickupLat
          : (riderRequest.dropoffLat ?? trip.destLat);

      const targetLng =
        targetType === "pickup"
          ? riderRequest.pickupLng
          : (riderRequest.dropoffLng ?? trip.destLng);

      if (typeof targetLat !== "number" || typeof targetLng !== "number") {
        throw new Error("Trip target coordinates are unavailable");
      }

      const targetDistanceKm = haversineDistanceKm(
        { lat: driverLocation.latitude, lng: driverLocation.longitude },
        { lat: targetLat, lng: targetLng }
      );

      const {
        etaSeconds: targetEtaSeconds,
        etaSource,
        etaComputedAt,
        etaStale,
      } = await getThrottledEta(
        { lat: driverLocation.latitude, lng: driverLocation.longitude },
        { lat: targetLat, lng: targetLng }
      );

      const hasArrivedAtPickup =
        riderRequest.status !== "on_trip" &&
        (targetDistanceKm <= ARRIVAL_THRESHOLD_KM ||
          (targetEtaSeconds !== null && targetEtaSeconds <= 60));

      const hasArrivedAtDropoff =
        riderRequest.status === "on_trip" &&
        (targetDistanceKm <= ARRIVAL_THRESHOLD_KM ||
          (targetEtaSeconds !== null && targetEtaSeconds <= 60));

      const hasArrivedAtTarget = hasArrivedAtPickup || hasArrivedAtDropoff;
      const isStarted = trip.status === "in_progress";

      const { autoPickedUp, autoDroppedOff } = await performAutoStatusChecks(
        riderRequest.id,
        trip.id,
        riderRequest.status,
        targetDistanceKm,
        targetEtaSeconds,
        !!riderRequest.riderPickupConfirmedAt
      );

      return {
        hasLocation: isStarted, // Only show live tracking if trip has started
        target: targetType,
        targetLat,
        targetLng,
        targetDistanceKm: isStarted ? targetDistanceKm : null,
        targetEtaSeconds: isStarted ? targetEtaSeconds : null,
        // backwards compatibility fields expected by current mobile code:
        pickupDistanceKm:
          isStarted && targetType === "pickup" ? targetDistanceKm : null,
        pickupEtaSeconds:
          isStarted && targetType === "pickup" ? targetEtaSeconds : null,
        etaSource,
        etaComputedAt,
        etaStale,
        hasArrivedAtTarget,
        hasArrivedAtPickup,
        hasArrivedAtDropoff,
        hasArrivedAtPickupForCurrentState:
          targetType === "pickup" ? hasArrivedAtPickup : false,
        autoPickedUp,
        autoDropoffEligible: autoDroppedOff,
        autoDroppedOff,
        requestStatus: autoDroppedOff ? "completed" : riderRequest.status,
        tripStatus: trip.status,
        driverLocation: isStarted
          ? {
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
              heading: driverLocation.heading,
              speed: driverLocation.speed,
              updatedAt: driverLocation.updatedAt,
            }
          : null,
      };
    }),

  saveDefaultAddress: protectedProcedure
    .input(saveAddressSchema)
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(profiles)
        .values({
          userId: ctx.userId,
          defaultAddress: input.address,
          defaultLat: input.latitude,
          defaultLong: input.longitude,
          appRole: "rider",
          universityRole: "student",
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            defaultAddress: input.address,
            defaultLat: input.latitude,
            defaultLong: input.longitude,
            updatedAt: new Date(),
          },
        });

      return { success: true };
    }),
});
