import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useDriverTripRequests(tripId?: string) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const utils = trpc.useUtils();

  const tripScopedQuery = trpc.trip.getTripRequests.useQuery(
    { tripId: tripId ?? "" },
    { enabled: Boolean(tripId), refetchInterval: 5000 }
  );

  const driverHomeQuery = trpc.trip.getTripRequests.useQuery(
    { type: "driver" },
    {
      enabled: Boolean(userId) && !tripId,
      refetchInterval: 5000,
    }
  );

  const effectiveQuery = tripId ? tripScopedQuery : driverHomeQuery;
  const rawRequests = effectiveQuery.data ?? [];
  const requests =
    tripId === undefined
      ? rawRequests.filter((r) => r.status === "pending")
      : rawRequests;
  const isLoading = effectiveQuery.isLoading;
  const isRefetching = effectiveQuery.isRefetching;
  const refetch = effectiveQuery.refetch;

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
