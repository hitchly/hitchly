import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppRole } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";
import { ActiveTripBanner } from "@/features/trip/active-trip-banner";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function GlobalActiveTripBanner() {
  const { data: session } = authClient.useSession();
  const { role } = useUserRole();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  // 1. Data Fetching
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

  // 2. Routing Logic
  const firstSegment = segments[0] as string | undefined;
  const inAuthGroup = firstSegment === "(auth)";
  const isOnDriveScreen = segments.some((s) => s === "driver");
  const isOnRideScreen = segments.some((s) => s === "rider");

  if (!session || inAuthGroup) return null;

  // 3. Render Driver Banner
  if (role === AppRole.DRIVER && activeTrip && !isOnDriveScreen) {
    return (
      <ActiveTripBanner
        tripId={activeTrip.id}
        topInset={insets.top}
        targetRoute="drive"
      />
    );
  }

  // 4. Render Rider Banner
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
