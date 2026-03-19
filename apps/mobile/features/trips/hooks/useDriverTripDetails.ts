import type { Href } from "expo-router";
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
  } = trpc.trip.getTripById.useQuery(
    { tripId: id },
    { enabled: !!id, refetchInterval: 5000 }
  );

  const isDriver = session?.user.id === trip?.driverId;
  const recurringScheduleId = trip?.recurringScheduleId;

  const { data: recurringSchedule } = trpc.recurringSchedule.getById.useQuery(
    { id: recurringScheduleId ?? "" },
    {
      enabled: Boolean(recurringScheduleId),
    }
  );

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
            router.replace("/(app)/driver/trips" as Href);
          },
        },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const deactivateSchedule = trpc.recurringSchedule.delete.useMutation({
    onSuccess: async () => {
      void utils.recurringSchedule.listMine.invalidate();
      void utils.trip.getTrips.invalidate();
      if (id) {
        await utils.trip.getTripById.invalidate({ tripId: id });
      }
      Alert.alert(
        "Schedule stopped",
        "Future rides for this recurring commute have been cancelled."
      );
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const startTrip = trpc.trip.startTrip.useMutation({
    onSuccess: async () => {
      // Invalidate both trips list and the specific trip
      void utils.trip.getTrips.invalidate();
      await utils.trip.getTripById.invalidate({ tripId: id });

      if (id) {
        router.push(`/(app)/(modals)/drive?tripId=${id}` as Href);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const canStartRide = () => {
    if (!trip?.departureTime) return { canStart: false };
    const departure = new Date(trip.departureTime);
    const now = new Date();
    const fifteenMinutesBefore = new Date(departure.getTime() - 20 * 60 * 1000);

    if (now >= fifteenMinutesBefore) return { canStart: true };
    return { canStart: false, availableAt: fifteenMinutesBefore };
  };

  const handleCancel = () => {
    const isRecurring = Boolean(trip?.recurringScheduleId);
    const message = isRecurring
      ? "This trip is part of a recurring schedule. Cancelling will stop all future occurrences of this recurring trip. Do you want to cancel the entire recurring trip?"
      : "Are you sure you want to cancel this trip?";

    Alert.alert("Cancel Trip", message, [
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
    recurringSchedule,
    cancelTrip: {
      isPending: cancelTrip.isPending,
    },
    startTrip: {
      isPending: startTrip.isPending,
      mutate: (variables: { tripId: string }) => {
        startTrip.mutate(variables);
      },
    },
    deactivateSchedule: {
      isPending: deactivateSchedule.isPending,
      mutate: (variables: { id: string }) => {
        deactivateSchedule.mutate(variables);
      },
    },
    canStartRide: canStartRide(),
    handleCancel,
    router,
  };
}
