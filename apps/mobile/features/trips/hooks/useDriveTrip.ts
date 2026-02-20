import { formatCityProvince } from "@hitchly/utils";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import type { TripCompletionSummaryData } from "@/features/trips/components/TripCompletionSummary";
import { openStopNavigation } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";

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
        location: formatCityProvince(trip.origin),
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
          location: formatCityProvince(trip.destination),
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
  } = trpc.trip.getTripById.useQuery({ tripId }, { enabled: !!tripId });

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
      Alert.alert("Error Completing Trip", err.message);
    },
  });

  const updateStatusMutation = trpc.trip.updatePassengerStatus.useMutation({
    onSuccess: () => void refetch(),
    onError: (err) => {
      if (err.message.includes("Rider has not confirmed pickup yet")) {
        Alert.alert(
          "Waiting for Confirmation",
          "Waiting for passenger to confirm pickup..."
        );
      } else {
        Alert.alert("Error", err.message);
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

    if (isWaitingForRider) {
      Alert.alert(
        "Waiting for Confirmation",
        "Waiting for passenger to confirm pickup..."
      );
      return;
    }

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

  return {
    tripHasError: !!error,
    isLoading,
    currentStop,
    hasRequests,
    allCompleted,
    hasPendingRequests,
    isWaitingForRider,
    isUpdatingStatus: updateStatusMutation.isPending,
    summaryVisible,
    setSummaryVisible,
    summaryData,
    actions: {
      handleAction,
      handleOpenMaps,
    },
  };
}
