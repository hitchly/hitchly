import { useMemo } from "react";
import { Alert } from "react-native";

import type { TripRequestWithDetails } from "@/components/swipe";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useDriverSwipeRequests() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const utils = trpc.useUtils();

<<<<<<< HEAD
  // 1. Single consolidated query for ALL requests managed by this driver
  const { data: allRequests, isLoading } = trpc.trip.getTripRequests.useQuery(
    { type: "driver" },
    {
      enabled: !!userId,
      refetchInterval: 5000,
    }
  );

  // 2. Extract unique trips from the requests
  const driverTrips = useMemo(() => {
    if (!allRequests) return [];
    const tripMap = new Map<
      string,
      NonNullable<(typeof allRequests)[0]["trip"]>
    >();
    for (const req of allRequests) {
      if (req.trip && !tripMap.has(req.trip.id)) {
        tripMap.set(req.trip.id, req.trip);
      }
    }
    return Array.from(tripMap.values());
  }, [allRequests]);

  // 3. Filter for pending ones to show in the swipe portal
  const allPendingRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter(
      (req) => req.status === "pending"
    ) as TripRequestWithDetails[];
  }, [allRequests]);
=======
  // Fetch all requests for trips where the current user is the driver
  const { data: requestsData, isLoading } = trpc.trip.getTripRequests.useQuery(
    {},
    {
      enabled: !!userId,
    }
  );

  const allRequests = useMemo(
    () => (requestsData ?? []).map((req) => req as TripRequestWithDetails),
    [requestsData]
  );
>>>>>>> 3e247b3 (Implemented recurring schedule)

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
    allRequests,
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
