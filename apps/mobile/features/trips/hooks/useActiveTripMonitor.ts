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
  } catch {
    // RoleProvider not ready - use default role
    // This prevents crashes during initial render
    // The component should wait for providers to be ready before rendering
  }

  const userId = session?.user.id;

  const { data: driverTrips } = trpc.trip.getTrips.useQuery(undefined, {
    enabled: !!userId && role === AppRole.DRIVER,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  const { data: riderRequests } = trpc.trip.getTripRequests.useQuery(
    { riderId: userId ?? "" },
    {
      enabled: !!userId && role === AppRole.RIDER,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    }
  );

  let activeTripId: string | undefined = undefined;
  let currentRoleLabel = "";
  let isRecurring = false;

  if (role === AppRole.DRIVER) {
    const activeDriverTrip = driverTrips?.find(
      (t) => t.status === "in_progress"
    );
    if (activeDriverTrip) {
      activeTripId = activeDriverTrip.id;
      currentRoleLabel = "DRIVING";
      isRecurring = !!activeDriverTrip.recurringScheduleId;
    }
  }

  if (role === AppRole.RIDER) {
    const activeRiderRequest = riderRequests?.find(
      (r) =>
        (r.status === "on_trip" || r.status === "accepted") &&
        r.trip?.status === "in_progress"
    );
    if (activeRiderRequest) {
      activeTripId = activeRiderRequest.tripId;
      currentRoleLabel = "RIDING";
      isRecurring = !!activeRiderRequest.trip?.recurringScheduleId;
    }
  }

  return {
    activeTripId,
    currentRoleLabel,
    isActive: !!activeTripId,
    isRecurring,
  };
}
