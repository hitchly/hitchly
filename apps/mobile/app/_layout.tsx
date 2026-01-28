import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActiveTripBanner } from "../components/trip/active-trip-banner";
import { NavTheme } from "../constants/theme";
import { AppThemeProvider } from "../context/theme-context";
import { authClient } from "../lib/auth-client";
import { trpc, trpcClient } from "../lib/trpc";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { data: session, isPending } = authClient.useSession();
  const utils = trpc.useUtils();

  const segments = useSegments();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const currentNavTheme =
    colorScheme === "dark" ? NavTheme.dark : NavTheme.light;

  // #region agent log
  const insets = useSafeAreaInsets();
  fetch("http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "app/_layout.tsx:29",
      message: "Safe area insets",
      data: {
        top: insets.top,
        bottom: insets.bottom,
        left: insets.left,
        right: insets.right,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "A",
    }),
  }).catch(() => {});
  // #endregion

  // Get user profile to check if driver
  const { data: userProfile } = trpc.profile.getMe.useQuery(undefined, {
    enabled: !!session,
  });

  // Query for active/in_progress trips
  const { data: trips } = trpc.trip.getTrips.useQuery(
    {},
    { enabled: !!session }
  );

  // Auto-cleanup dummy passengers on app launch (for drivers)
  const deleteDummyPassengers = trpc.admin.deleteDummyPassengers.useMutation();
  const cleanupRanRef = useRef(false);

  useEffect(() => {
    // Only run cleanup once per session, not on every trips change
    if (!session || !userProfile || !trips || cleanupRanRef.current) return;

    const isDriver = userProfile?.profile?.appRole === "driver";
    if (!isDriver) return;

    // Mark cleanup as run to prevent infinite loop
    cleanupRanRef.current = true;

    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "app/_layout.tsx:autoCleanup",
        message: "Auto-cleanup dummy passengers on launch",
        data: { userId: session.user.id, isDriver, tripsCount: trips.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "K",
      }),
    }).catch(() => {});
    // #endregion

    // Clean up dummy passengers for each trip (batch all mutations, don't invalidate until all done)
    const tripIds = trips.map((trip) => trip.id);
    let completedCount = 0;
    const totalTrips = tripIds.length;

    tripIds.forEach((tripId) => {
      deleteDummyPassengers.mutate(
        { tripId },
        {
          onSuccess: () => {
            completedCount++;
            // Only invalidate once all cleanup mutations are done
            if (completedCount === totalTrips) {
              utils.trip.getTrips.invalidate();
              utils.trip.getTripRequests.invalidate();
            }
          },
          onError: (err) => {
            completedCount++;
            // Silently fail - dummy passengers might not exist
            // #region agent log
            fetch(
              "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  location: "app/_layout.tsx:autoCleanup:error",
                  message: "Cleanup failed for trip",
                  data: { tripId, error: err.message },
                  timestamp: Date.now(),
                  sessionId: "debug-session",
                  runId: "run1",
                  hypothesisId: "K",
                }),
              }
            ).catch(() => {});
            // #endregion
            // Still invalidate when all are done (even if some failed)
            if (completedCount === totalTrips) {
              utils.trip.getTrips.invalidate();
              utils.trip.getTripRequests.invalidate();
            }
          },
        }
      );
    });
  }, [
    session,
    userProfile,
    trips,
    deleteDummyPassengers,
    utils.trip.getTrips,
    utils.trip.getTripRequests,
  ]);

  // #region agent log
  useEffect(() => {
    if (trips) {
      fetch(
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "app/_layout.tsx:39",
            message: "getTrips results",
            data: {
              tripsCount: trips.length,
              tripIds: trips.map((t) => t.id),
              tripStatuses: trips.map((t) => t.status),
              userId: session?.user?.id,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run3",
            hypothesisId: "E",
          }),
        }
      ).catch(() => {});
    }
  }, [trips, session]);
  // #endregion

  // Find in_progress trip (banner only shows for in_progress trips)
  const activeTrip =
    trips?.find((trip) => trip.status === "in_progress") || null;

  // Get active rider requests (accepted or on_trip)
  const { data: riderRequests } = trpc.trip.getTripRequests.useQuery(
    {},
    { enabled: !!session && userProfile?.profile?.appRole !== "driver" }
  );
  const activeRiderRequest = riderRequests?.find(
    (req) => req.status === "accepted" || req.status === "on_trip"
  );
  const activeRiderTripId = activeRiderRequest?.tripId;

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "app/_layout.tsx:53",
        message: "Active trip check",
        data: {
          hasActiveTrip: !!activeTrip,
          activeTripId: activeTrip?.id,
          activeTripStatus: activeTrip?.status,
          tripsCount: trips?.length,
          allTripStatuses: trips?.map((t) => t.status),
          hasActiveRiderRequest: !!activeRiderRequest,
          activeRiderTripId,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "M",
      }),
    }).catch(() => {});
  }, [activeTrip, trips, activeRiderRequest, activeRiderTripId]);
  // #endregion

  // Fetch trip details if in_progress to get current stop info
  const { data: tripDetails } = trpc.trip.getTripById.useQuery(
    { tripId: activeTrip?.id || "" },
    { enabled: !!activeTrip && activeTrip.status === "in_progress" }
  );

  // Get current stop info for banner
  const getCurrentStopText = () => {
    if (!tripDetails || tripDetails.status !== "in_progress") return undefined;
    if (!tripDetails.requests || tripDetails.requests.length === 0)
      return undefined;

    // Find first incomplete stop
    for (const request of tripDetails.requests) {
      if (request.status === "accepted") {
        const passengerName = (request as any).rider?.name || "Passenger";
        return `Next: Pickup ${passengerName}`;
      }
      if (request.status === "on_trip") {
        const passengerName = (request as any).rider?.name || "Passenger";
        return `Next: Drop off ${passengerName}`;
      }
    }
    return undefined;
  };

  useEffect(() => {
    if (isPending) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)" as any);
    } else if (session && inAuthGroup) {
      router.replace("/(app)" as any);
    }
  }, [session, isPending, segments, router]);

  const firstSegment = segments[0] as string | undefined;
  const inAuthGroup = firstSegment === "(auth)";
  // Hide banner only on drive screen or ride screen (they have their own headers)
  const isOnDriveScreen = segments.some((s) => (s as string) === "drive");
  const isOnRideScreen = segments.some((s) => (s as string) === "ride");
  const showDriverBanner =
    !!session &&
    !inAuthGroup &&
    activeTrip &&
    !isOnDriveScreen &&
    userProfile?.profile?.appRole === "driver";
  const showRiderBanner =
    !!session &&
    !inAuthGroup &&
    !!activeRiderRequest &&
    !!activeRiderTripId &&
    !isOnRideScreen &&
    userProfile?.profile?.appRole !== "driver";

  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "app/_layout.tsx:109",
      message: "Banner render state",
      data: {
        showDriverBanner,
        showRiderBanner,
        hasSession: !!session,
        inAuthGroup,
        hasActiveTrip: !!activeTrip,
        isOnDriveScreen,
        isOnRideScreen,
        segments: segments.join("/"),
        appRole: userProfile?.profile?.appRole,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "run4",
      hypothesisId: "B",
    }),
  }).catch(() => {});
  // #endregion

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationThemeProvider value={currentNavTheme}>
        <AppThemeProvider>
          <View style={{ flex: 1 }}>
            {showDriverBanner && (
              <ActiveTripBanner
                tripId={activeTrip.id}
                currentStop={getCurrentStopText()}
                topInset={insets.top}
                targetRoute="drive"
              />
            )}
            {showRiderBanner && (
              <ActiveTripBanner
                tripId={activeRiderTripId}
                currentStop="Trip in progress"
                topInset={insets.top}
                targetRoute="ride"
              />
            )}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </View>
        </AppThemeProvider>
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
