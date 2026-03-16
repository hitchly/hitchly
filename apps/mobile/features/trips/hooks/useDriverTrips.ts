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

  const groupedDriverTrips = useMemo(() => {
    if (!trips || !currentUserId) return [];

    const now = new Date();

    // Only consider trips for this driver that aren't cancelled
    const driverTrips = trips.filter(
      (trip) => trip.status !== "cancelled" && trip.driverId === currentUserId
    );

    const bySchedule = new Map<string, typeof driverTrips>();
    const standalone: typeof driverTrips = [];

    for (const trip of driverTrips) {
      if (!trip.recurringScheduleId) {
        standalone.push(trip);
        continue;
      }

      const key = trip.recurringScheduleId;
      const list = bySchedule.get(key) ?? [];
      list.push(trip);
      bySchedule.set(key, list);
    }

    const grouped: typeof driverTrips = [...standalone];

    for (const [, groupTrips] of bySchedule.entries()) {
      const futureTrips = groupTrips.filter(
        (t) => new Date(t.departureTime) >= now
      );

      if (futureTrips.length === 0) {
        // If no future trips left, you could either skip or show the latest past one.
        continue;
      }

      const [first, ...rest] = futureTrips;
      if (!first) continue;

      const nextTrip = rest.reduce((earliest, current) => {
        return new Date(current.departureTime) <
          new Date(earliest.departureTime)
          ? current
          : earliest;
      }, first);

      grouped.push(nextTrip);
    }

    // Sort by departureTime ascending so nearest upcoming trips appear first
    return grouped.sort(
      (a, b) =>
        new Date(a.departureTime).getTime() -
        new Date(b.departureTime).getTime()
    );
  }, [trips, currentUserId]);

  return {
    trips: groupedDriverTrips,
    isLoading,
    isRefetching,
    refetch,
    router,
  };
}
