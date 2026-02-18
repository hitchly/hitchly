// TODO: Fix eslint errors in this file and re-enable linting
/* eslint-disable */

import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NavTheme } from "@/constants/theme";
import { AppThemeProvider } from "@/context/theme-context";
import { ActiveTripBanner } from "@/features/trip/active-trip-banner";
import { authClient } from "@/lib/auth-client";
import { StripeProviderWrapper } from "@/lib/stripe-provider";
import { trpc, trpcClient } from "@/lib/trpc";

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

  const insets = useSafeAreaInsets();

  const { data: userProfile } = trpc.profile.getMe.useQuery(undefined, {
    enabled: !!session,
  });

  const { data: trips } = trpc.trip.getTrips.useQuery(
    {},
    { enabled: !!session }
  );

  // Find in_progress trip (banner only shows for in_progress trips)
  const activeTrip =
    trips?.find((trip) => trip.status === "in_progress") || null;

  // Get active rider requests (accepted or on_trip)
  const { data: riderRequests } = trpc.trip.getTripRequests.useQuery(
    {},
    { enabled: !!session && userProfile?.profile.appRole !== "driver" }
  );
  const activeRiderRequest = riderRequests?.find(
    (req) => req.status === "accepted" || req.status === "on_trip"
  );
  const activeRiderTripId = activeRiderRequest?.tripId;

  // Fetch trip details if in_progress to get current stop info
  const { data: tripDetails } = trpc.trip.getTripById.useQuery(
    { tripId: activeTrip?.id ?? "" },
    { enabled: !!activeTrip && activeTrip.status === "in_progress" }
  );

  // Get current stop info for banner
  const getCurrentStopText = () => {
    if (tripDetails?.status !== "in_progress") return undefined;
    if (!tripDetails.requests || tripDetails.requests.length === 0)
      return undefined;

    // Find first incomplete stop
    for (const request of tripDetails.requests) {
      if (request.status === "accepted") {
        const passengerName = request.rider?.name ?? "Passenger";
        return `Next: Pickup ${passengerName}`;
      }
      if (request.status === "on_trip") {
        const passengerName = request.rider?.name ?? "Passenger";
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
      router.replace("/(auth)");
    } else if (session && inAuthGroup) {
      router.replace("/(app)");
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
    userProfile?.profile.appRole === "driver";
  const showRiderBanner =
    !!session &&
    !inAuthGroup &&
    !!activeRiderRequest &&
    !!activeRiderTripId &&
    !isOnRideScreen &&
    userProfile?.profile.appRole !== "driver";

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
        <StripeProviderWrapper>
          <AppContent />
        </StripeProviderWrapper>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
