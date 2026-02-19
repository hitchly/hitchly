import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useDriverTripDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();

  const {
    data: trip,
    isLoading,
    refetch,
  } = trpc.trip.getTripById.useQuery({ tripId: id }, { enabled: !!id });

  const isDriver = session?.user.id === trip?.driverId;

  const cancelTrip = trpc.trip.cancelTrip.useMutation({
    onSuccess: async () => {
      void utils.trip.getTrips.invalidate();
      void utils.trip.getTripRequests.invalidate();
      await utils.trip.getTripById.invalidate({ tripId: id });
      await refetch();
      Alert.alert("Success", "Trip cancelled successfully", [
        {
          text: "OK",
          onPress: () => {
            router.push("/(app)/driver/trips");
          },
        },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const startTrip = trpc.trip.startTrip.useMutation({
    onSuccess: () => {
      if (id) router.push(`/(app)/driver/trips/${id}/drive`);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const canStartRide = () => {
    if (!trip?.departureTime) return { canStart: false };
    const departure = new Date(trip.departureTime);
    const now = new Date();
    const tenMinutesBefore = new Date(departure.getTime() - 10 * 60 * 1000);

    if (now >= tenMinutesBefore) return { canStart: true };
    return { canStart: false, availableAt: tenMinutesBefore };
  };

  const handleCancel = () => {
    Alert.alert("Cancel Trip", "Are you sure you want to cancel this trip?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => {
          cancelTrip.mutate({ tripId: id });
        },
      },
    ]);
  };

  return {
    trip,
    isLoading,
    isDriver,
    cancelTrip: {
      isPending: cancelTrip.isPending,
    },
    startTrip: {
      isPending: startTrip.isPending,
      mutate: (variables: { tripId: string }) => {
        startTrip.mutate(variables);
      },
    },
    canStartRide: canStartRide(),
    handleCancel,
    router,
  };
}
