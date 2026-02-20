import { formatCityProvince, formatOrdinal } from "@hitchly/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

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
  } = trpc.trip.getTripById.useQuery({ tripId: id }, { enabled: !!id });

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
      return {
        title: "Driver en route",
        message: "Driver arriving in 5 minutes (placeholder)",
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

      if (idx >= 0 && onTripRequests.length > 1) {
        return {
          title: "On the way",
          message: `Dropping passengers off, you're ${formatOrdinal(idx + 1)} to be dropped off`,
          sub: "ETA placeholders to be replaced with live data",
        };
      }
      return {
        title: "On the way",
        message: "Arriving at destination in 10 minutes (placeholder)",
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
    cancelTripRequest: {
      isPending: cancelTripRequest.isPending,
    },
    handleCancelRequest,
    router,
  };
}
