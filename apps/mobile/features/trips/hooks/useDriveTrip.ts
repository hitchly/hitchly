import { shortenAddress } from "@hitchly/utils";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import type { TripCompletionSummaryData } from "@/features/trips/components/TripCompletionSummary";
import { openStopNavigation } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";

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

// Strictly type the data to remove all `any` usages
type RequestStatus =
  | "pending"
  | "accepted"
  | "on_trip"
  | "completed"
  | "rejected"
  | "cancelled";

interface ActiveRequest {
  id: string;
  status: RequestStatus;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  riderPickupConfirmedAt: string | null;
  rider: { name: string | null; email: string | null } | null;
}

interface ActiveTrip {
  origin: string;
  destination: string;
  destLat: number | null;
  destLng: number | null;
  status: string; // Add status to track if already completed
  requests: ActiveRequest[];
  summary?: TripCompletionSummaryData;
}

export interface DriveStop {
  type: "pickup" | "dropoff";
  requestId: string;
  passengerName: string;
  location: string;
  lat: number;
  lng: number;
}

const getCurrentStop = (
  trip: ActiveTrip | null | undefined
): DriveStop | null => {
  if (!trip?.requests || trip.requests.length === 0) return null;

  const activeRequests = trip.requests.filter(
    (req) =>
      req.status === "accepted" ||
      req.status === "on_trip" ||
      req.status === "completed"
  );

  if (activeRequests.length === 0) return null;

  // 1. Process Pickups First
  for (const request of activeRequests) {
    if (request.status === "accepted") {
      return {
        type: "pickup",
        requestId: request.id,
        passengerName: request.rider?.name ?? "Passenger",
        location: request.pickupAddress || shortenAddress(trip.origin),
        lat: request.pickupLat,
        lng: request.pickupLng,
      };
    }
  }

  // 2. Then Process Dropoffs
  for (const request of activeRequests) {
    if (request.status === "on_trip") {
      const dropoffLat = request.dropoffLat ?? trip.destLat;
      const dropoffLng = request.dropoffLng ?? trip.destLng;
      if (dropoffLat && dropoffLng) {
        return {
          type: "dropoff",
          requestId: request.id,
          passengerName: request.rider?.name ?? "Passenger",
          location: shortenAddress(trip.destination),
          lat: dropoffLat,
          lng: dropoffLng,
        };
      }
    }
  }

  return null;
};

export function useDriveTrip(tripId: string) {
  const utils = trpc.useUtils();

  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryData, setSummaryData] =
    useState<TripCompletionSummaryData | null>(null);

  const {
    data: tripData,
    isLoading,
    error,
    refetch,
  } = trpc.trip.getTripById.useQuery(
    { tripId },
    {
      enabled: !!tripId,
      refetchInterval: 3000, // Keep UI in sync with backend auto-complete
    }
  );

  const { data: liveStatus } = trpc.location.getDriverLiveStatus.useQuery(
    { tripId },
    {
      enabled: !!tripId,
      refetchInterval: 3000,
    }
  );

  // Safely cast the incoming trpc data
  const trip = tripData as unknown as ActiveTrip | undefined;

  const completeTripMutation = trpc.trip.completeTrip.useMutation({
    onSuccess: (result: { summary?: unknown }) => {
      void utils.trip.getTrips.invalidate();
      void utils.trip.getTripById.invalidate({ tripId });

      // Cast the result to the summary data shape and show the modal
      setSummaryData(result.summary as TripCompletionSummaryData);
      setSummaryVisible(true);
    },
    onError: (err) => {
      // If trip is already completed (race condition with auto-complete), just refresh data
      if (
        err.message.includes("Can only complete trips that are in progress")
      ) {
        void utils.trip.getTripById.invalidate({ tripId });
        return;
      }
      Alert.alert("Error Completing Trip", err.message);
    },
  });

  // Show summary when trip is auto-completed by backend (e.g., via location tracking)
  useEffect(() => {
    if (!trip) return;

    if (
      trip.status === "completed" &&
      trip.summary &&
      !summaryVisible &&
      !completeTripMutation.isPending
    ) {
      setSummaryData(trip.summary);
      setSummaryVisible(true);
    } else if (
      trip.status === "completed" &&
      !trip.summary &&
      !summaryVisible &&
      !completeTripMutation.isPending
    ) {
      // If we are completed but don't have a summary yet, refresh to get it
      void utils.trip.getTripById.invalidate({ tripId });
    }
  }, [
    trip,
    summaryVisible,
    completeTripMutation.isPending,
    tripId,
    utils.trip.getTripById,
  ]);

  const updateStatusMutation = trpc.trip.updatePassengerStatus.useMutation({
    onSuccess: () => void refetch(),
    onError: (err) => {
      const message =
        typeof err.message === "string"
          ? err.message
          : "Something went wrong. Please try again.";
      if (message.includes("Rider has not confirmed pickup yet")) {
        Alert.alert(
          "Waiting for Confirmation",
          "Waiting for passenger to confirm pickup..."
        );
      } else {
        Alert.alert("Error", message);
      }
    },
  });

  // Derived State
  const requests = useMemo(() => trip?.requests ?? [], [trip?.requests]);
  const currentStop = useMemo(() => getCurrentStop(trip), [trip]);
  const hasRequests = requests.length > 0;

  const allCompleted =
    hasRequests &&
    requests.every(
      (req) =>
        req.status === "completed" ||
        req.status === "rejected" ||
        req.status === "cancelled"
    );

  const hasPendingRequests = requests.some((req) => req.status === "pending");

  const isWaitingForRider = useMemo(() => {
    if (currentStop?.type !== "pickup") return false;
    const currentRequest = requests.find(
      (req) => req.id === currentStop.requestId
    );
    return !!(currentRequest && !currentRequest.riderPickupConfirmedAt);
  }, [currentStop, requests]);

  // Auto-complete trip if all passengers are done and trip isn't already completed
  useEffect(() => {
    if (
      allCompleted &&
      trip?.status !== "completed" &&
      !completeTripMutation.isPending &&
      !summaryVisible
    ) {
      completeTripMutation.mutate({ tripId });
    }
  }, [
    allCompleted,
    trip?.status,
    tripId,
    completeTripMutation.isPending,
    summaryVisible,
    completeTripMutation,
  ]);

  const handleAction = () => {
    if (!currentStop) return;

    const action = currentStop.type === "pickup" ? "pickup" : "dropoff";

    const actionText =
      currentStop.type === "pickup"
        ? "Passenger Picked Up"
        : "Passenger Dropped Off";

    Alert.alert(
      actionText,
      `Confirm that you have ${action === "pickup" ? "picked up" : "dropped off"} ${currentStop.passengerName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            updateStatusMutation.mutate(
              { tripId, requestId: currentStop.requestId, action },
              {
                onSuccess: () => {
                  if (action === "dropoff") {
                    Alert.alert(
                      "Payment (Placeholder)",
                      `Transaction will complete now and ${currentStop.passengerName} will be charged.`
                    );
                  }
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleOpenMaps = () => {
    if (!currentStop) return;
    void openStopNavigation(currentStop.lat, currentStop.lng);
  };

  const startTripMutation = trpc.trip.startTrip.useMutation({
    onSuccess: async () => {
      void refetch();
      await utils.trip.getTripById.invalidate({ tripId });
    },
    onError: (err) => {
      Alert.alert("Error Starting Trip", err.message);
    },
  });

  const handleStartTrip = () => {
    startTripMutation.mutate({ tripId });
  };

  return {
    tripHasError: !!error,
    isLoading,
    currentStop,
    hasRequests,
    allCompleted,
    hasPendingRequests,
    isWaitingForRider,
    isUpdatingStatus:
      updateStatusMutation.isPending || startTripMutation.isPending,
    summaryVisible,
    setSummaryVisible,
    summaryData,
    tripStatus: trip?.status ?? "pending",
    isStarted: trip?.status === "in_progress" || trip?.status === "completed",
    liveStatusInfo: {
      distanceLabel: formatDistanceLabel(
        liveStatus && "targetDistanceKm" in liveStatus
          ? liveStatus.targetDistanceKm
          : null
      ),
      etaLabel: formatEtaLabel(
        liveStatus && "targetEtaSeconds" in liveStatus
          ? liveStatus.targetEtaSeconds
          : null
      ),
      targetType:
        liveStatus && "targetType" in liveStatus ? liveStatus.targetType : null,
      isLocationStale:
        liveStatus && "isLocationStale" in liveStatus
          ? liveStatus.isLocationStale
          : false,
    },
    actions: {
      handleAction,
      handleOpenMaps,
      handleStartTrip,
    },
  };
}
