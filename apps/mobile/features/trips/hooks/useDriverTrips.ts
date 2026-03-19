import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useDriverTrips() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;

  const utils = trpc.useUtils();

  const {
    data: trips,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.trip.getTrips.useQuery();

  const generateUpcomingTrips =
    trpc.recurringSchedule.generateUpcomingTripsForUser.useMutation({
      onSuccess: async () => {
        await utils.trip.getTrips.invalidate();
      },
    });

  useEffect(() => {
    if (!currentUserId) return;
    // Generate upcoming trips from any active recurring schedules for this driver
    if (!generateUpcomingTrips.isPending) {
      generateUpcomingTrips.mutate({ daysAhead: 28 });
    }
    // We intentionally only depend on currentUserId so this runs once per login
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const driverTrips = useMemo(() => {
    if (!trips || !currentUserId) return [];

    // Show all non-cancelled trips for this driver (one row per instance),
    // including both past and future, with most recent first.
    return trips
      .filter(
        (trip) => trip.status !== "cancelled" && trip.driverId === currentUserId
      )
      .sort(
        (a, b) =>
          new Date(b.departureTime).getTime() -
          new Date(a.departureTime).getTime()
      );
  }, [trips, currentUserId]);

  return {
    trips: driverTrips,
    isLoading,
    isRefetching,
    refetch,
    router,
  };
}
