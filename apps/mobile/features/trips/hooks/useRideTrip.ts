import { formatCityProvince, formatOrdinal } from "@hitchly/utils";
import { useMemo } from "react";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { openStopNavigation } from "@/lib/navigation";
import { isTestAccount } from "@/lib/test-accounts";
import { trpc } from "@/lib/trpc";

export function useRideTrip(tripId: string) {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;
  const utils = trpc.useUtils();

  const { data: userProfile } = trpc.profile.getMe.useQuery();
  const isTestUser = isTestAccount(userProfile?.email);

  const {
    data: trip,
    isLoading,
    refetch,
  } = trpc.trip.getTripById.useQuery({ tripId }, { enabled: !!tripId });

  const confirmPickupMutation = trpc.trip.confirmRiderPickup.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.trip.getTripRequests.invalidate();
      Alert.alert("Success", "Pickup confirmed");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Derived State
  const userRequest = useMemo(
    () => trip?.requests.find((req) => req.riderId === currentUserId),
    [trip, currentUserId]
  );

  const isAccepted = userRequest?.status === "accepted";
  const isOnTrip = userRequest?.status === "on_trip";
  const isCompleted = userRequest?.status === "completed";
  const pickupConfirmed = !!userRequest?.riderPickupConfirmedAt;

  // Calculate dropoff order
  const dropoffOrder = useMemo(() => {
    if (!isOnTrip || !trip?.requests) return null;
    const onTripRequests = trip.requests.filter((r) => r.status === "on_trip");
    const idx = onTripRequests.findIndex((r) => r.id === userRequest.id);
    if (idx >= 0 && onTripRequests.length > 1) {
      return idx + 1;
    }
    return null;
  }, [isOnTrip, trip?.requests, userRequest?.id]);

  const statusInfo = useMemo(() => {
    if (!trip) return null;

    if (isAccepted) {
      return {
        title: "WAITING FOR PICKUP",
        message: pickupConfirmed
          ? "Pickup confirmed. Waiting for driver to start the trip."
          : "Driver is on the way.",
        location: formatCityProvince(trip.origin),
      };
    }
    if (isOnTrip) {
      if (dropoffOrder) {
        return {
          title: "ON THE WAY",
          message: `Dropping passengers off. You are ${formatOrdinal(
            dropoffOrder
          )} to be dropped off.`,
          location: formatCityProvince(trip.destination),
        };
      }
      return {
        title: "ON THE WAY",
        message: "Arriving at destination shortly.",
        location: formatCityProvince(trip.destination),
      };
    }
    if (isCompleted) {
      return {
        title: "TRIP COMPLETED",
        message: "Thank you for riding with Hitchly!",
        location: formatCityProvince(trip.destination),
      };
    }
    return null;
  }, [trip, isAccepted, isOnTrip, isCompleted, pickupConfirmed, dropoffOrder]);

  const handleConfirmPickup = () => {
    if (!userRequest?.id) return;
    Alert.alert(
      "Confirm Pickup",
      "Confirm that you have been picked up by the driver?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            confirmPickupMutation.mutate({ requestId: userRequest.id });
          },
        },
      ]
    );
  };

  const handleOpenMaps = () => {
    if (!trip) return;
    if (isAccepted) {
      void openStopNavigation(trip.originLat ?? 0, trip.originLng ?? 0);
    } else if (isOnTrip) {
      const dropoffLat = userRequest.dropoffLat ?? trip.destLat;
      const dropoffLng = userRequest.dropoffLng ?? trip.destLng;
      if (dropoffLat && dropoffLng) {
        void openStopNavigation(dropoffLat, dropoffLng);
      }
    }
  };

  return {
    isLoading,
    tripMissing: !isLoading && (!trip || !userRequest),
    trip,
    userRequest,
    isTestUser,
    isAccepted,
    isOnTrip,
    isCompleted,
    pickupConfirmed,
    statusInfo,
    isConfirming: confirmPickupMutation.isPending,
    actions: {
      handleConfirmPickup,
      handleOpenMaps,
    },
  };
}
