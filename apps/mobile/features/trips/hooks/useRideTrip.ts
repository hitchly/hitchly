import {
  formatCityProvince,
  formatOrdinal,
  shortenAddress,
} from "@hitchly/utils";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { openStopNavigation } from "@/lib/navigation";
import { isTestAccount } from "@/lib/test-accounts";
import { trpc } from "@/lib/trpc";

const LOCATION_POLL_INTERVAL_MS = 5000;

function formatDistanceLabel(
  distanceKm: number | null | undefined
): string | null {
  if (
    distanceKm === null ||
    distanceKm === undefined ||
    Number.isNaN(distanceKm)
  )
    return null;

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${String(meters)} m away`;
  }

  return `${distanceKm.toFixed(1)} km away`;
}

function formatEtaLabel(
  durationSeconds: number | null | undefined
): string | null {
  if (
    durationSeconds === null ||
    durationSeconds === undefined ||
    Number.isNaN(durationSeconds)
  )
    return null;

  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  if (totalMinutes < 60) return `${String(totalMinutes)} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${String(hours)} hr`;
  return `${String(hours)} hr ${String(minutes)} min`;
}

function formatFreshnessLabel(
  updatedAt: string | Date | null | undefined
): string {
  if (!updatedAt) return "Last updated unknown";

  const ts =
    typeof updatedAt === "string"
      ? new Date(updatedAt).getTime()
      : updatedAt.getTime();

  if (Number.isNaN(ts)) return "Last updated unknown";

  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 10) return "Updated just now";
  if (diffSec < 60) return `Updated ${String(diffSec)}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Updated ${String(diffMin)}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  return `Updated ${String(diffHr)}h ago`;
}

type LiveLocationPayload = {
  hasLocation?: boolean;
  target?: "pickup" | "dropoff";
  targetDistanceKm?: number | null;
  targetEtaSeconds?: number | null;
  pickupDistanceKm?: number | null;
  pickupEtaSeconds?: number | null;
  etaSource?: "google" | "cache";
  etaComputedAt?: string | null;
  etaStale?: boolean;
  hasArrivedAtTarget?: boolean;
  hasArrivedAtPickup?: boolean;
  hasArrivedAtDropoff?: boolean;
  autoPickupEligible?: boolean;
  autoPickedUp?: boolean;
  autoDropoffEligible?: boolean;
  autoDroppedOff?: boolean;
  requestStatus?: string;
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    updatedAt: string | Date;
  } | null;
} | null;

export function useRideTrip(tripId: string) {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;
  const utils = trpc.useUtils();

  const { data: userProfile } = trpc.profile.getMe.useQuery();
  const isTestUser = isTestAccount(userProfile?.email);

  const {
    data: trip,
    isLoading,
    refetch,
  } = trpc.trip.getTripById.useQuery(
    { tripId },
    {
      enabled: !!tripId,
      refetchInterval: LOCATION_POLL_INTERVAL_MS,
      refetchIntervalInBackground: true,
    }
  );

  const {
    data: liveDriverRaw,
    isFetching: isFetchingDriverLocation,
    refetch: refetchDriverLocation,
  } = trpc.location.getTripDriverLiveLocation.useQuery(
    { tripId },
    {
      enabled: !!tripId,
      refetchInterval: LOCATION_POLL_INTERVAL_MS,
      refetchIntervalInBackground: true,
    }
  );

  const liveDriver = (liveDriverRaw ?? null) as LiveLocationPayload;
  const [lastKnownDriverLocation, setLastKnownDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    const lat = liveDriver?.driverLocation?.latitude;
    const lng = liveDriver?.driverLocation?.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      setLastKnownDriverLocation({ latitude: lat, longitude: lng });
    }
  }, [
    liveDriver?.driverLocation?.latitude,
    liveDriver?.driverLocation?.longitude,
  ]);

  const confirmPickupMutation = trpc.trip.confirmRiderPickup.useMutation({
    onSuccess: () => {
      void refetch();
      void refetchDriverLocation();
      void utils.trip.getTripRequests.invalidate();
      Alert.alert("Success", "Pickup confirmed");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const userRequest = useMemo(
    () => trip?.requests.find((req) => req.riderId === currentUserId),
    [trip, currentUserId]
  );

  const backendRequestStatus = liveDriver?.requestStatus;
  const effectiveStatus =
    backendRequestStatus === "completed"
      ? "completed"
      : backendRequestStatus === "on_trip"
        ? "on_trip"
        : backendRequestStatus === "accepted"
          ? "accepted"
          : userRequest?.status;

  const isAccepted = effectiveStatus === "accepted";
  const isOnTrip = effectiveStatus === "on_trip";
  const isCompleted = effectiveStatus === "completed";
  const pickupConfirmed = !!userRequest?.riderPickupConfirmedAt;
  const preferredDestinationLabel =
    userRequest?.dropoffLabel ?? shortenAddress(trip?.destination);

  const hasDriverLocation = !!liveDriver?.hasLocation;
  const target = liveDriver?.target ?? (isOnTrip ? "dropoff" : "pickup");

  const rawTargetDistanceKm =
    liveDriver?.targetDistanceKm ??
    (target === "pickup" ? (liveDriver?.pickupDistanceKm ?? null) : null);

  const rawTargetEtaSeconds =
    liveDriver?.targetEtaSeconds ??
    (target === "pickup" ? (liveDriver?.pickupEtaSeconds ?? null) : null);

  const hasArrivedAtTarget = !!liveDriver?.hasArrivedAtTarget;
  const hasArrivedAtPickup = !!liveDriver?.hasArrivedAtPickup;
  const hasArrivedAtDropoff = !!liveDriver?.hasArrivedAtDropoff;

  const autoPickedUp = !!liveDriver?.autoPickedUp;
  const autoDroppedOff = !!liveDriver?.autoDroppedOff;

  const etaSource = liveDriver?.etaSource ?? "google";
  const etaComputedAt = liveDriver?.etaComputedAt ?? null;
  const etaStale = !!liveDriver?.etaStale;

  const targetDistanceLabel = formatDistanceLabel(rawTargetDistanceKm);
  const targetEtaLabel = formatEtaLabel(rawTargetEtaSeconds);

  const locationUpdatedAt = liveDriver?.driverLocation?.updatedAt ?? null;
  const locationFreshnessLabel = formatFreshnessLabel(locationUpdatedAt);
  const etaFreshnessLabel = formatFreshnessLabel(etaComputedAt);

  const dropoffOrder = useMemo(() => {
    if (!isOnTrip || !trip?.requests || !userRequest?.id) return null;
    const onTripRequests = trip.requests.filter((r) => r.status === "on_trip");
    const idx = onTripRequests.findIndex((r) => r.id === userRequest.id);
    if (idx >= 0 && onTripRequests.length > 1) return idx + 1;
    return null;
  }, [isOnTrip, trip?.requests, userRequest?.id]);

  const statusInfo = useMemo(() => {
    if (!trip) return null;

    if (isAccepted) {
      if (trip.status === "active") {
        return {
          title: "TRIP ACCEPTED",
          message:
            "The driver has accepted your request. We'll notify you once they start the trip.",
          location: formatCityProvince(trip.origin),
          pickupLocation:
            userRequest?.pickupAddress || shortenAddress(trip.origin),
        };
      }

      const distancePrefix = targetDistanceLabel
        ? `Driver is ${targetDistanceLabel}.`
        : "Driver location unavailable right now.";
      const etaSuffix = targetEtaLabel ? ` ETA: ${targetEtaLabel}.` : "";

      const message = pickupConfirmed
        ? "Pickup confirmed. Waiting for driver to start the trip."
        : hasArrivedAtPickup
          ? "Driver has arrived at your pickup point."
          : `${distancePrefix}${etaSuffix} Heading to your pickup point.`;

      return {
        title: "WAITING FOR PICKUP",
        message,
        location: formatCityProvince(trip.origin),
        pickupLocation:
          userRequest?.pickupAddress || shortenAddress(trip.origin),
      };
    }

    if (isOnTrip) {
      if (hasArrivedAtDropoff) {
        return {
          title: "ARRIVING",
          message: "You are arriving at your destination now.",
          location: preferredDestinationLabel,
        };
      }

      if (dropoffOrder) {
        return {
          title: "ON THE WAY",
          message: `Dropping passengers off. You are ${formatOrdinal(
            dropoffOrder
          )} to be dropped off.`,
          location: preferredDestinationLabel,
        };
      }

      const enRouteMessage = targetDistanceLabel
        ? `Destination is ${targetDistanceLabel}.${
            targetEtaLabel ? ` ETA: ${targetEtaLabel}.` : ""
          }`
        : "Arriving at destination shortly.";

      return {
        title: "ON THE WAY",
        message: enRouteMessage,
        location: preferredDestinationLabel,
      };
    }

    if (isCompleted) {
      return {
        title: "TRIP COMPLETED",
        message: "Thank you for riding with Hitchly!",
        location: preferredDestinationLabel,
      };
    }

    return null;
  }, [
    trip,
    isAccepted,
    isOnTrip,
    isCompleted,
    pickupConfirmed,
    dropoffOrder,
    hasArrivedAtPickup,
    hasArrivedAtDropoff,
    targetDistanceLabel,
    targetEtaLabel,
    preferredDestinationLabel,
  ]);

  const liveDriverInfo = useMemo(() => {
    if (!isAccepted && !isOnTrip && !isCompleted) return null;

    return {
      hasDriverLocation,
      isFetchingDriverLocation,
      target,
      hasArrivedAtTarget,
      hasArrivedAtPickup,
      hasArrivedAtDropoff,
      autoPickedUp,
      autoDroppedOff,
      targetDistanceKm: rawTargetDistanceKm,
      targetDistanceLabel,
      targetEtaSeconds: rawTargetEtaSeconds,
      targetEtaLabel,
      // backwards compatibility for existing screen fields:
      pickupDistanceKm: target === "pickup" ? rawTargetDistanceKm : null,
      pickupDistanceLabel: target === "pickup" ? targetDistanceLabel : null,
      pickupEtaSeconds: target === "pickup" ? rawTargetEtaSeconds : null,
      pickupEtaLabel: target === "pickup" ? targetEtaLabel : null,
      etaSource,
      etaStale,
      etaComputedAt,
      locationFreshnessLabel,
      etaFreshnessLabel,
      driverLocation: liveDriver?.driverLocation ?? null,
      requestStatus: backendRequestStatus ?? userRequest?.status ?? null,
    };
  }, [
    isAccepted,
    isOnTrip,
    isCompleted,
    hasDriverLocation,
    isFetchingDriverLocation,
    target,
    hasArrivedAtTarget,
    hasArrivedAtPickup,
    hasArrivedAtDropoff,
    autoPickedUp,
    autoDroppedOff,
    rawTargetDistanceKm,
    targetDistanceLabel,
    rawTargetEtaSeconds,
    targetEtaLabel,
    etaSource,
    etaStale,
    etaComputedAt,
    locationFreshnessLabel,
    etaFreshnessLabel,
    liveDriver?.driverLocation,
    backendRequestStatus,
    userRequest?.status,
  ]);

  const handleConfirmPickup = () => {
    if (!userRequest?.id) return;

    Alert.alert(
      "Confirm Pickup",
      "Confirm that you have been picked up by the driver?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            confirmPickupMutation.mutate({ requestId: userRequest.id });
          },
        },
      ]
    );
  };

  const handleOpenMaps = () => {
    if (!trip) return;

    if (isAccepted) {
      if (trip.status === "active") return;

      const liveLat = liveDriver?.driverLocation?.latitude;
      const liveLng = liveDriver?.driverLocation?.longitude;
      const cachedLat = lastKnownDriverLocation?.latitude;
      const cachedLng = lastKnownDriverLocation?.longitude;
      const targetLat = liveLat ?? cachedLat ?? trip.originLat;
      const targetLng = liveLng ?? cachedLng ?? trip.originLng;

      if (typeof targetLat === "number" && typeof targetLng === "number") {
        void openStopNavigation(targetLat, targetLng);
      } else {
        Alert.alert(
          "Location unavailable",
          "We could not find a map location for this ride yet."
        );
      }
      return;
    }

    if (isOnTrip && userRequest) {
      const dropoffLat = userRequest.dropoffLat ?? trip.destLat;
      const dropoffLng = userRequest.dropoffLng ?? trip.destLng;
      if (dropoffLat && dropoffLng) {
        void openStopNavigation(dropoffLat, dropoffLng);
      } else {
        Alert.alert(
          "Location unavailable",
          "We could not find your destination location."
        );
      }
    }
  };

  const mapsDisabledReason =
    isAccepted && trip?.status === "active"
      ? "Maps tracking unlocks when the driver starts the trip."
      : null;
  const canOpenMaps = !mapsDisabledReason;

  return {
    isLoading,
    tripMissing: !isLoading && (!trip || !userRequest),
    trip,
    userRequest,
    isTestUser,
    isAccepted,
    isOnTrip,
    isCompleted,
    pickupConfirmed,
    statusInfo,
    liveDriverInfo,
    isConfirming: confirmPickupMutation.isPending,
    actions: {
      handleConfirmPickup,
      handleOpenMaps,
      refetchDriverLocation,
      canOpenMaps,
      mapsDisabledReason,
    },
  };
}
