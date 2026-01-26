import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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

  const segments = useSegments();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const currentNavTheme =
    colorScheme === "dark" ? NavTheme.dark : NavTheme.light;

  // Query for active/in_progress trips
  const { data: trips } = trpc.trip.getTrips.useQuery(
    {},
    { enabled: !!session }
  );

  // Find active or in_progress trip
  const activeTrip =
    trips?.find(
      (trip) => trip.status === "active" || trip.status === "in_progress"
    ) || null;

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
  const showBanner = !!session && !inAuthGroup && activeTrip;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationThemeProvider value={currentNavTheme}>
        <AppThemeProvider>
          <View style={{ flex: 1 }}>
            {showBanner && (
              <ActiveTripBanner
                tripId={activeTrip.id}
                currentStop={getCurrentStopText()}
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
