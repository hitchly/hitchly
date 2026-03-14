import { formatCityProvince, formatOrdinal } from "@hitchly/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

const POLL_INTERVAL_MS = 5000;

type LiveDriverPayload = {
  hasLocation?: boolean;
  target?: "pickup" | "dropoff" | string | null;
  hasArrivedAtPickup?: boolean;
  hasArrivedAtDropoff?: boolean;
  hasArrivedAtTarget?: boolean;
  targetDistanceKm?: number | null;
  targetEtaSeconds?: number | null;
  pickupDistanceKm?: number | null;
  pickupEtaSeconds?: number | null;
  autoPickedUp?: boolean;
  autoDroppedOff?: boolean;
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    updatedAt: string | Date;
  } | null;
} | null;

function formatDistanceLabel(
  distanceKm: number | null | undefined
): string | null {
  if (distanceKm == null || Number.isNaN(distanceKm)) return null;

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

function formatEtaLabel(seconds: number | null | undefined): string | null {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return null;
  if (seconds < 60) return "less than 1 min";
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function useRiderTripDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;

  const {
    data: trip,
    isLoading,
    refetch,
  } = trpc.trip.getTripById.useQuery(
    { tripId: id },
    {
      enabled: !!id,
      refetchInterval: POLL_INTERVAL_MS,
      refetchIntervalInBackground: true,
    }
  );

  const { data: liveDriverRaw } =
    trpc.location.getTripDriverLiveLocation.useQuery(
      { tripId: id },
      {
        enabled: !!id,
        refetchInterval: POLL_INTERVAL_MS,
        refetchIntervalInBackground: true,
      }
    );

  const liveDriver = (liveDriverRaw ?? null) as LiveDriverPayload;

  const userRequest =
    trip?.requests.find(
      (req) =>
        req.riderId === currentUserId &&
        (req.status === "pending" || req.status === "accepted")
    ) ?? trip?.requests.find((req) => req.riderId === currentUserId);

  const isRider = !!userRequest;

  const cancelTripRequest = trpc.trip.cancelTripRequest.useMutation({
    onSuccess: async () => {
      await utils.trip.getTripById.invalidate({ tripId: id });
      void utils.trip.getTripRequests.invalidate();
      void utils.trip.getTrips.invalidate();
      await refetch();
      Alert.alert("Success", "Request cancelled successfully", [
        { text: "OK" },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const riderEtaDetails = (() => {
    if (!trip || (trip.status !== "active" && trip.status !== "in_progress")) {
      return null;
    }
    if (!userRequest) return null;

    if (userRequest.status === "accepted") {
      const hasLocation = !!liveDriver?.hasLocation;
      const hasArrived = !!liveDriver?.hasArrivedAtPickup;

      const distanceLabel = formatDistanceLabel(
        liveDriver?.target === "pickup"
          ? (liveDriver?.targetDistanceKm ?? null)
          : (liveDriver?.pickupDistanceKm ?? null)
      );

      const etaLabel = formatEtaLabel(
        liveDriver?.target === "pickup"
          ? (liveDriver?.targetEtaSeconds ?? null)
          : (liveDriver?.pickupEtaSeconds ?? null)
      );

      return {
        title: hasArrived ? "Driver arrived" : "Driver en route",
        message: hasArrived
          ? "Your driver has arrived at your pickup point."
          : hasLocation && distanceLabel && etaLabel
            ? `Driver is ${distanceLabel} away from pickup (ETA ${etaLabel}).`
            : hasLocation && distanceLabel
              ? `Driver is ${distanceLabel} away from pickup.`
              : etaLabel
                ? `Driver is en route (ETA ${etaLabel}).`
                : "Fetching live driver location...",
        sub: trip.origin
          ? `Pickup: ${formatCityProvince(trip.origin)}`
          : undefined,
      };
    }

    if (userRequest.status === "on_trip") {
      const onTripRequests = trip.requests.filter(
        (r) => r.status === "on_trip"
      );
      const idx = onTripRequests.findIndex((r) => r.id === userRequest.id);

      const destinationDistanceLabel = formatDistanceLabel(
        liveDriver?.targetDistanceKm ?? null
      );
      const destinationEtaLabel = formatEtaLabel(
        liveDriver?.targetEtaSeconds ?? null
      );

      if (idx >= 0 && onTripRequests.length > 1) {
        return {
          title: "On the way",
          message:
            destinationDistanceLabel && destinationEtaLabel
              ? `Dropping passengers off, you're ${formatOrdinal(
                  idx + 1
                )} to be dropped off • ${destinationDistanceLabel} remaining (ETA ${destinationEtaLabel}).`
              : `Dropping passengers off, you're ${formatOrdinal(
                  idx + 1
                )} to be dropped off`,
          sub: trip.destination
            ? formatCityProvince(trip.destination)
            : undefined,
        };
      }

      return {
        title: "On the way",
        message:
          destinationDistanceLabel && destinationEtaLabel
            ? `${destinationDistanceLabel} to destination (ETA ${destinationEtaLabel}).`
            : destinationDistanceLabel
              ? `${destinationDistanceLabel} to destination.`
              : destinationEtaLabel
                ? `Arriving in ${destinationEtaLabel}.`
                : "Arriving at destination shortly.",
        sub: trip.destination
          ? formatCityProvince(trip.destination)
          : undefined,
      };
    }

    return null;
  })();

  const handleCancelRequest = () => {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel your request for this trip?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => {
            if (userRequest?.id) {
              cancelTripRequest.mutate({ requestId: userRequest.id });
            }
          },
        },
      ]
    );
  };

  return {
    trip,
    isLoading,
    isRider,
    userRequest,
    riderEtaDetails,
    liveDriver: {
      hasLocation: !!liveDriver?.hasLocation,
      target: liveDriver?.target ?? null,
      hasArrivedAtPickup: !!liveDriver?.hasArrivedAtPickup,
      hasArrivedAtDropoff: !!liveDriver?.hasArrivedAtDropoff,
      hasArrivedAtTarget: !!liveDriver?.hasArrivedAtTarget,
      targetDistanceKm: liveDriver?.targetDistanceKm ?? null,
      targetEtaSeconds: liveDriver?.targetEtaSeconds ?? null,
      pickupDistanceKm: liveDriver?.pickupDistanceKm ?? null,
      etaSecondsToPickup: liveDriver?.pickupEtaSeconds ?? null,
      autoPickedUp: !!liveDriver?.autoPickedUp,
      autoDroppedOff: !!liveDriver?.autoDroppedOff,
      driverLocation: liveDriver?.driverLocation ?? null,
    },
    cancelTripRequest: {
      isPending: cancelTripRequest.isPending,
    },
    handleCancelRequest,
    router,
  };
}
