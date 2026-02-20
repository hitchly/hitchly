import { useMemo } from "react";
import { Alert } from "react-native";

import { AppRole } from "@/constants/roles";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useRequests() {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const utils = trpc.useUtils();

  const { data: userProfile, isLoading: isLoadingProfile } =
    trpc.profile.getMe.useQuery(undefined, { enabled: !!userId });

  const isDriver = userProfile?.profile.appRole === AppRole.DRIVER;

  const { data: driverTrips, isLoading: isLoadingTrips } =
    trpc.trip.getTrips.useQuery(undefined, { enabled: !!userId && isDriver });

  const activeDriverTrips = useMemo(
    () => driverTrips?.filter((trip) => trip.status !== "cancelled") ?? [],
    [driverTrips]
  );

  const firstTripId = activeDriverTrips[0]?.id;

  const {
    data: driverRequests,
    isLoading: isLoadingDriverRequests,
    refetch: refetchDriverReqs,
  } = trpc.trip.getTripRequests.useQuery(
    { tripId: firstTripId ?? "" },
    { enabled: !!userId && !!firstTripId && isDriver }
  );

  const {
    data: riderRequests,
    isLoading: isLoadingRiderRequests,
    refetch: refetchRiderReqs,
  } = trpc.trip.getTripRequests.useQuery(
    { riderId: userId },
    { enabled: !!userId && !isDriver }
  );

  const isLoading =
    isLoadingProfile ||
    isLoadingTrips ||
    (isDriver ? isLoadingDriverRequests : isLoadingRiderRequests);

  const filteredRequests = useMemo(() => {
    const rawRequests = isDriver
      ? (driverRequests ?? [])
      : (riderRequests ?? []);
    return rawRequests.filter(
      (req) => req.trip && req.trip.status !== "cancelled"
    );
  }, [isDriver, driverRequests, riderRequests]);

  const pendingRequests = useMemo(
    () => filteredRequests.filter((req) => req.status === "pending"),
    [filteredRequests]
  );

  const acceptRequest = trpc.trip.acceptTripRequest.useMutation({
    onSuccess: () => {
      void utils.trip.getTripRequests.invalidate();
      void utils.trip.getTripById.invalidate();
      void (isDriver ? refetchDriverReqs() : refetchRiderReqs());
    },
    onError: (error) => {
      setTimeout(() => {
        Alert.alert("Error", error.message);
      }, 500);
    },
  });

  const rejectRequest = trpc.trip.rejectTripRequest.useMutation({
    onSuccess: () => {
      void utils.trip.getTripRequests.invalidate();
      if (isDriver) void refetchDriverReqs();
    },
    onError: (error) => {
      setTimeout(() => {
        Alert.alert("Error", error.message);
      }, 500);
    },
  });

  return {
    requests: filteredRequests,
    pendingRequests,
    isDriver,
    isLoading,
    acceptRequest: acceptRequest.mutate,
    rejectRequest: rejectRequest.mutate,
    isPendingAction: acceptRequest.isPending || rejectRequest.isPending,
  };
}
