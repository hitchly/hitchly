import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export function useSafety(initialTripId?: string) {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;

  const [activeTripId, setActiveTripId] = useState<string | null>(
    initialTripId ?? null
  );
  const [targetUserId, setTargetUserId] = useState("");
  const [reason, setReason] = useState("");

  const { data: trips } = trpc.trip.getTrips.useQuery();

  const { data: trip, isLoading: isTripLoading } =
    trpc.trip.getTripById.useQuery(
      { tripId: activeTripId ?? "" },
      { enabled: !!activeTripId }
    );

  const createComplaint = trpc.complaints.createComplaint.useMutation({
    onSuccess: () => {
      setReason("");
      Alert.alert(
        "Report Submitted",
        "Our safety team will review this shortly."
      );
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  useEffect(() => {
    if (!trip || !currentUserId || targetUserId) return;

    if (trip.driverId !== currentUserId) {
      setTargetUserId(trip.driverId);
    } else if (trip.requests.length) {
      const activeRider = trip.requests.find(
        (r) => r.status === "on_trip" || r.status === "accepted"
      );
      if (activeRider) setTargetUserId(activeRider.riderId);
    }
  }, [trip, currentUserId, targetUserId]);

  const reportedUserLabel = useMemo(() => {
    if (!activeTripId) return "Select a trip below";
    if (isTripLoading) return "Identifying user...";

    // Check if reporting the driver
    if (trip?.driverId !== currentUserId && trip?.driver) {
      const driverName =
        trip.driver.name || trip.driver.email || "Unknown Driver";
      return `Driver: ${driverName}`;
    }

    // Check if reporting a rider
    const rider = trip?.requests.find((r) => r.riderId === targetUserId)?.rider;
    if (rider) {
      const riderName = rider.name ?? rider.email ?? "Unknown Rider";
      return `Rider: ${riderName}`;
    }

    return "Unknown User";
  }, [trip, activeTripId, isTripLoading, targetUserId, currentUserId]);

  return {
    trips: trips ?? [],
    activeTripId,
    setActiveTripId,
    reportedUserLabel,
    reason,
    setReason,
    isSubmitting: createComplaint.isPending,
    canSubmit: targetUserId.length > 0 && reason.trim().length > 5,
    submitReport: () => {
      createComplaint.mutate({
        targetUserId,
        content: reason.trim(),
        rideId: activeTripId ?? undefined,
      });
    },
  };
}
