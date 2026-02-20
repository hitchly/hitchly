import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useRiderTripRequests() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const utils = trpc.useUtils();

  const {
    data: requestsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.trip.getTripRequests.useQuery(
    { riderId: userId },
    { enabled: !!userId }
  );

  const requests = requestsData ?? [];

  const cancelMutation = trpc.trip.cancelTripRequest.useMutation({
    onSuccess: () => {
      void utils.trip.getTripRequests.invalidate();
      void utils.trip.getAvailableTrips.invalidate();
      Alert.alert("Success", "Request cancelled");
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
    cancelRequest: (requestId: string) => {
      cancelMutation.mutate({ requestId });
    },
    isCancelling: cancelMutation.isPending,
  };
}
