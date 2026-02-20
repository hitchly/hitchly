import { AppRole } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useActiveTripMonitor() {
  const { data: session } = authClient.useSession();
  const { role } = useUserRole();
  const userId = session?.user.id;

  const { data: driverTrips } = trpc.trip.getTrips.useQuery(undefined, {
    enabled: !!userId && role === AppRole.DRIVER,
  });

  const { data: riderRequests } = trpc.trip.getTripRequests.useQuery(
    { riderId: userId ?? "" },
    { enabled: !!userId && role === AppRole.RIDER }
  );

  let activeTripId: string | undefined = undefined;
  let currentRoleLabel = "";

  if (role === AppRole.DRIVER) {
    // UBER LOGIC: Active when picking up ("active") or driving ("in_progress")
    const activeDriverTrip = driverTrips?.find(
      (t) => t.status === "in_progress" || t.status === "active"
    );
    if (activeDriverTrip) {
      activeTripId = activeDriverTrip.id;
      currentRoleLabel = "DRIVING";
    }
  }

  if (role === AppRole.RIDER) {
    // UBER LOGIC: Active when waiting for pickup ("accepted") or in car ("on_trip")
    const activeRiderRequest = riderRequests?.find(
      (r) => r.status === "on_trip" || r.status === "accepted"
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
