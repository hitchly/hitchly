import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppRole } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";
import { ActiveTripBanner } from "@/features/trips/components/ActiveTripBanner";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function GlobalActiveTripBanner() {
  const { data: session } = authClient.useSession();
  const { role } = useUserRole();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const { data: trips } = trpc.trip.getTrips.useQuery(
    {},
    { enabled: !!session }
  );
  const activeTrip = trips?.find((t) => t.status === "in_progress");

  const { data: riderRequests } = trpc.trip.getTripRequests.useQuery(
    {},
    { enabled: !!session && role === AppRole.RIDER }
  );

  const activeRiderRequest = riderRequests?.find(
    (req) => req.status === "accepted" || req.status === "on_trip"
  );

  const firstSegment = segments[0] as string | undefined;
  const inAuthGroup = firstSegment === "(auth)";
  const isOnDriveScreen = segments.some((s) => s === "driver");
  const isOnRideScreen = segments.some((s) => s === "rider");

  if (!session || inAuthGroup) return null;

  if (role === AppRole.DRIVER && activeTrip && !isOnDriveScreen) {
    return (
      <ActiveTripBanner
        tripId={activeTrip.id}
        topInset={insets.top}
        targetRoute="drive"
      />
    );
  }

  if (role === AppRole.RIDER && activeRiderRequest && !isOnRideScreen) {
    return (
      <ActiveTripBanner
        tripId={activeRiderRequest.tripId}
        currentStop="Trip in progress"
        topInset={insets.top}
        targetRoute="ride"
      />
    );
  }

  return null;
}
