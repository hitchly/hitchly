import { AppRole, type AppRoleType } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useActiveTripMonitor() {
  const { data: session } = authClient.useSession();

  // Get role - handle case where RoleProvider might not be ready
  // This can happen during initial render before providers are fully initialized
  let role: AppRoleType = AppRole.RIDER;
  try {
    const roleContext = useUserRole();
    role = roleContext.role;
  } catch (error) {
    // RoleProvider not ready - use default role
    // This prevents crashes during initial render
    // The component should wait for providers to be ready before rendering
  }

  const userId = session?.user.id;

  // Only make queries if we have a session
  // The enabled flag prevents queries from running when conditions aren't met
  const shouldQuery = !!userId;

  // These hooks must be called unconditionally (React rules)
  // They will be disabled if shouldQuery is false or role doesn't match
  // If tRPC context isn't ready, the queries will fail gracefully
  const { data: driverTrips } = trpc.trip.getTrips.useQuery(undefined, {
<<<<<<< HEAD
    enabled: !!userId && role === AppRole.DRIVER,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
=======
    enabled: shouldQuery && role === AppRole.DRIVER,
>>>>>>> 3e247b3 (Implemented recurring schedule)
  });

  const { data: riderRequests } = trpc.trip.getTripRequests.useQuery(
    { riderId: userId ?? "" },
<<<<<<< HEAD
    {
      enabled: !!userId && role === AppRole.RIDER,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    }
=======
    { enabled: shouldQuery && role === AppRole.RIDER }
>>>>>>> 3e247b3 (Implemented recurring schedule)
  );

  let activeTripId: string | undefined = undefined;
  let currentRoleLabel = "";

  if (role === AppRole.DRIVER) {
    const activeDriverTrip = driverTrips?.find(
      (t) => t.status === "in_progress"
    );
    if (activeDriverTrip) {
      activeTripId = activeDriverTrip.id;
      currentRoleLabel = "DRIVING";
    }
  }

  if (role === AppRole.RIDER) {
<<<<<<< HEAD
    const activeRiderRequest = riderRequests?.find(
      (r) =>
        (r.status === "on_trip" || r.status === "accepted") &&
        r.trip?.status === "in_progress"
=======
    // Active only when the ride is actually underway:
    // - request status "on_trip", OR
    // - underlying trip is marked "in_progress"
    const activeRiderRequest = riderRequests?.find(
      (r) => r.status === "on_trip" || r.trip?.status === "in_progress"
>>>>>>> 3e247b3 (Implemented recurring schedule)
    );
    if (activeRiderRequest) {
      activeTripId = activeRiderRequest.tripId;
      currentRoleLabel = "RIDING";
    }
  }

  return {
    activeTripId,
    currentRoleLabel,
    isActive: !!activeTripId,
  };
}
