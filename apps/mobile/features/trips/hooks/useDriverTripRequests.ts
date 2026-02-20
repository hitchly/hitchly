import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useDriverTripRequests(tripId?: string) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const utils = trpc.useUtils();

  const { data: driverTrips } = trpc.trip.getTrips.useQuery(undefined, {
    enabled: !!userId && !tripId,
  });

  const targetTripId = tripId ?? driverTrips?.[0]?.id;

  const {
    data: requestsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.trip.getTripRequests.useQuery(
    { tripId: targetTripId ?? "" },
    { enabled: !!targetTripId }
  );

  const requests = requestsData ?? [];

  const handleSuccess = (msg: string) => {
    void utils.trip.getTripRequests.invalidate();
    void utils.trip.getTripById.invalidate();
    Alert.alert("Success", msg);
  };

  const acceptMutation = trpc.trip.acceptTripRequest.useMutation({
    onSuccess: () => {
      handleSuccess("Request accepted successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const rejectMutation = trpc.trip.rejectTripRequest.useMutation({
    onSuccess: () => {
      handleSuccess("Request rejected");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  return {
    requests,
    isLoading,
    isRefetching,
    refetch,
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
