import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import type { RouterOutputs } from "@/lib/trpc";
import { trpc } from "@/lib/trpc";

type DriverTrip = RouterOutputs["trip"]["getTrips"][number] & {
  recurringDaysOfWeek?: number[] | null;
};

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
  const { data: recurringSchedules } = trpc.recurringSchedule.listMine.useQuery(
    undefined,
    { enabled: !!currentUserId, refetchOnMount: "always" }
  );

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

  useEffect(() => {
    if (!currentUserId || !trips || !recurringSchedules) return;
    if (generateUpcomingTrips.isPending) return;

    const hasActiveSchedule = recurringSchedules.some((s) => s.isActive);
    if (!hasActiveSchedule) return;

    const driverTripsOnly = trips.filter(
      (trip) => trip.driverId === currentUserId
    );
    const hasCompletedRecurring = driverTripsOnly.some(
      (trip) => trip.recurringScheduleId && trip.status === "completed"
    );
    const hasNonCompletedRecurring = driverTripsOnly.some(
      (trip) =>
        trip.recurringScheduleId &&
        trip.status !== "completed" &&
        trip.status !== "cancelled"
    );

    if (hasCompletedRecurring && !hasNonCompletedRecurring) {
      generateUpcomingTrips.mutate({ daysAhead: 28 });
    }
    // Intentionally reacts to fresh trips/schedule snapshots to recover missing upcoming occurrences.
  }, [currentUserId, trips, recurringSchedules, generateUpcomingTrips]);

  const driverTrips = useMemo(() => {
    if (!trips || !currentUserId) return [];

    const recurringDaysByScheduleId = new Map(
      (recurringSchedules ?? []).map((schedule) => {
        const days: number[] = [];
        if (schedule.sunday) days.push(0);
        if (schedule.monday) days.push(1);
        if (schedule.tuesday) days.push(2);
        if (schedule.wednesday) days.push(3);
        if (schedule.thursday) days.push(4);
        if (schedule.friday) days.push(5);
        if (schedule.saturday) days.push(6);
        return [schedule.id, days] as const;
      })
    );

    const driverNonCancelledTrips = (trips as DriverTrip[])
      .filter(
        (trip) => trip.status !== "cancelled" && trip.driverId === currentUserId
      )
      .map((trip) => {
        if (
          !trip.recurringScheduleId ||
          (trip.recurringDaysOfWeek?.length ?? 0) > 0
        ) {
          return trip;
        }
        return {
          ...trip,
          recurringDaysOfWeek:
            recurringDaysByScheduleId.get(trip.recurringScheduleId) ?? null,
        };
      });

    const oneTimeTrips = driverNonCancelledTrips.filter(
      (trip) => !trip.recurringScheduleId
    );
    const completedRecurringTrips = driverNonCancelledTrips.filter(
      (trip) => trip.recurringScheduleId && trip.status === "completed"
    );
    const nonCompletedRecurringTrips = driverNonCancelledTrips.filter(
      (trip) => trip.recurringScheduleId && trip.status !== "completed"
    );

    const recurringGroups = new Map<
      string,
      (typeof nonCompletedRecurringTrips)[number][]
    >();
    for (const trip of nonCompletedRecurringTrips) {
      if (!trip.recurringScheduleId) continue;
      const group = recurringGroups.get(trip.recurringScheduleId) ?? [];
      group.push(trip);
      recurringGroups.set(trip.recurringScheduleId, group);
    }

    const now = Date.now();
    const recurringRepresentatives = Array.from(recurringGroups.values())
      .map((group) => {
        const upcoming = group
          .filter((trip) => new Date(trip.departureTime).getTime() >= now)
          .sort(
            (a, b) =>
              new Date(a.departureTime).getTime() -
              new Date(b.departureTime).getTime()
          );
        if (upcoming.length > 0) return upcoming[0]!;

        const latestPast = [...group].sort(
          (a, b) =>
            new Date(b.departureTime).getTime() -
            new Date(a.departureTime).getTime()
        );
        return latestPast[0]!;
      })
      .filter(Boolean);

    return [
      ...oneTimeTrips,
      ...completedRecurringTrips,
      ...recurringRepresentatives,
    ].sort(
      (a, b) =>
        new Date(b.departureTime).getTime() -
        new Date(a.departureTime).getTime()
    );
  }, [trips, recurringSchedules, currentUserId]);

  return {
    trips: driverTrips,
    isLoading,
    isRefetching,
    refetch,
    router,
  };
}
