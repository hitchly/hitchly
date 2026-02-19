import { useRouter } from "expo-router";
import { useMemo } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useDriverTrips() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;

  const {
    data: trips,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.trip.getTrips.useQuery();

  const activeDriverTrips = useMemo(() => {
    return (
      trips?.filter(
        (trip) => trip.status !== "cancelled" && trip.driverId === currentUserId
      ) ?? []
    );
  }, [trips, currentUserId]);

  return {
    trips: activeDriverTrips,
    isLoading,
    isRefetching,
    refetch,
    router,
  };
}
