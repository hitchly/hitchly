import { useMemo } from "react";
import { Alert } from "react-native";

import type { TripRequestWithDetails } from "@/components/swipe";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useDriverSwipeRequests() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const utils = trpc.useUtils();

  const { data: driverTrips, isLoading: isLoadingTrips } =
    trpc.trip.getTrips.useQuery(undefined, {
      enabled: !!userId,
    });

  const tripIds = useMemo(
    () =>
      driverTrips
        ?.filter(
          (trip) => trip.status === "pending" || trip.status === "active"
        )
        .map((trip) => trip.id) ?? [],
    [driverTrips]
  );

  const requestQueries = tripIds.map((tripId) =>
    trpc.trip.getTripRequests.useQuery(
      { tripId },
      { enabled: !!userId && tripIds.length > 0 }
    )
  );

  const allPendingRequests = useMemo(() => {
    const requests: TripRequestWithDetails[] = [];
    requestQueries.forEach((query) => {
      if (query.data) {
        query.data
          .filter((req) => req.status === "pending")
          .forEach((req) => requests.push(req as TripRequestWithDetails));
      }
    });
    return requests;
  }, [requestQueries]);

  const isLoading = isLoadingTrips || requestQueries.some((q) => q.isLoading);

  const handleMutationSuccess = (message: string) => {
    void utils.trip.getTripRequests.invalidate();
    void utils.trip.getTripById.invalidate();
    Alert.alert("Success", message);
  };

  const acceptMutation = trpc.trip.acceptTripRequest.useMutation({
    onSuccess: () => {
      handleMutationSuccess("Request accepted successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const rejectMutation = trpc.trip.rejectTripRequest.useMutation({
    onSuccess: () => {
      handleMutationSuccess("Request rejected");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  return {
    driverTrips,
    allPendingRequests,
    isLoading,
    acceptRequest: (requestId: string) => {
      acceptMutation.mutate({ requestId });
    },
    isAccepting: acceptMutation.isPending,
    rejectRequest: (requestId: string) => {
      rejectMutation.mutate({ requestId });
    },
    isRejecting: rejectMutation.isPending,
  };
}
