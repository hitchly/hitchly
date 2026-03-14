import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { saveAddressSchema } from "@hitchly/db";
import { db } from "@hitchly/db/client";
import {
  profiles,
  tripRequests,
  trips,
  userLocations,
} from "@hitchly/db/schema";

import { calculateTripDistance } from "../../services/googlemaps";
import { protectedProcedure, router } from "../trpc";

const EARTH_RADIUS_KM = 6371;

// ETA throttling / cache controls
const ETA_RECOMPUTE_INTERVAL_MS = 30 * 1000; // only call Google at most once per 30s per key
const ETA_CACHE_MAX_AGE_MS = 2 * 60 * 1000; // mark ETA stale after 2 min

// Auto-state thresholds
const ARRIVAL_THRESHOLD_KM = 0.08; // ~80m for "arrived"
const AUTO_PICKUP_THRESHOLD_KM = 0.05; // ~50m for auto pickup confirmation
const AUTO_DROPOFF_THRESHOLD_KM = 0.07; // ~70m for auto dropoff completion

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
  const round = (n: number) => n.toFixed(4);
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

      console.log(
        `[LOCATION_UPDATE] User: ${ctx.userId}, Lat: ${input.latitude}, Lng: ${input.longitude}, Time: ${now.toISOString()}`
      );

      return { success: true, updatedAt: now };
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

      if (targetLat == null || targetLng == null) {
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

      const autoPickupEligible =
        riderRequest.status === "accepted" &&
        !riderRequest.riderPickupConfirmedAt &&
        (targetDistanceKm <= AUTO_PICKUP_THRESHOLD_KM ||
          (targetEtaSeconds !== null && targetEtaSeconds <= 30));

      let autoPickedUp = false;
      if (autoPickupEligible) {
        await db
          .update(tripRequests)
          .set({
            riderPickupConfirmedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tripRequests.id, riderRequest.id));

        autoPickedUp = true;
      }

      const autoDropoffEligible =
        riderRequest.status === "on_trip" &&
        (targetDistanceKm <= AUTO_DROPOFF_THRESHOLD_KM ||
          (targetEtaSeconds !== null && targetEtaSeconds <= 30));

      let autoDroppedOff = false;
      if (autoDropoffEligible) {
        await db
          .update(tripRequests)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(tripRequests.id, riderRequest.id));

        autoDroppedOff = true;

        // Keep trip summary counters in sync.
        const remainingBooked = Math.max(0, trip.bookedSeats - 1);
        await db
          .update(trips)
          .set({
            bookedSeats: remainingBooked,
            updatedAt: new Date(),
          })
          .where(eq(trips.id, trip.id));

        // If all requests on this trip are done, close trip.
        const allTripRequests = await db
          .select({
            id: tripRequests.id,
            status: tripRequests.status,
          })
          .from(tripRequests)
          .where(eq(tripRequests.tripId, trip.id));

        const allDone =
          allTripRequests.length > 0 &&
          allTripRequests.every(
            (r) =>
              r.status === "completed" ||
              r.status === "rejected" ||
              r.status === "cancelled"
          );

        if (allDone && trip.status !== "completed") {
          await db
            .update(trips)
            .set({
              status: "completed",
              updatedAt: new Date(),
            })
            .where(eq(trips.id, trip.id));
        }
      }

      return {
        hasLocation: true,
        target: targetType,
        targetLat,
        targetLng,
        targetDistanceKm,
        targetEtaSeconds,
        // backwards compatibility fields expected by current mobile code:
        pickupDistanceKm: targetType === "pickup" ? targetDistanceKm : null,
        pickupEtaSeconds: targetType === "pickup" ? targetEtaSeconds : null,
        etaSource,
        etaComputedAt,
        etaStale,
        hasArrivedAtTarget,
        hasArrivedAtPickup,
        hasArrivedAtDropoff,
        hasArrivedAtPickupForCurrentState:
          targetType === "pickup" ? hasArrivedAtPickup : false,
        autoPickupEligible,
        autoPickedUp,
        autoDropoffEligible,
        autoDroppedOff,
        requestStatus: autoDroppedOff ? "completed" : riderRequest.status,
        driverLocation: {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          heading: driverLocation.heading,
          speed: driverLocation.speed,
          updatedAt: driverLocation.updatedAt,
        },
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
