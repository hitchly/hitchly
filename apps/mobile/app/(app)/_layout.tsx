import { RequireLocation } from "@/components/location/require-location";
import { LocationProvider } from "@/context/location-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";

const AppRoutes = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: userProfile } = trpc.profile.getMe.useQuery();
  const segments = useSegments();

  const banCheck = trpc.profile.getBanStatus.useQuery(undefined, {
    enabled: !!session?.user?.id,
    refetchOnMount: true,
    retry: false,
  });

  useEffect(() => {
    if (banCheck.data?.isBanned) {
      router.replace("/banned");
    }
  }, [banCheck.data?.isBanned, router]);

  const appRole = userProfile?.profile?.appRole || "rider";
  const isDriver = appRole === "driver";
  const isRider = appRole === "rider";

  // Determine which screen to show for discover tab
  const discoverScreenName = isDriver ? "requests" : "matchmaking";

  // Hide tab bar when on drive screen
  const isOnDriveScreen = segments.some(
    (segment) => (segment as string) === "drive"
  );

  if (banCheck.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return (
    <Tabs
      initialRouteName={discoverScreenName}
      screenOptions={{
        tabBarShowLabel: true,
        headerShown: false,
        tabBarActiveTintColor: "#7A003C",
        tabBarInactiveTintColor: "#687076",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#eeeeee",
          display: isOnDriveScreen ? "none" : "flex",
        },
      }}
    >
      {/* Discover/Passengers tab - role-aware */}
      <Tabs.Screen
        name="matchmaking"
        options={{
          title: isRider ? "Discover" : undefined,
          href: isRider ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={28}
              name={focused ? "search" : "search-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: isDriver ? "Passengers" : undefined,
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={28}
              name={focused ? "people" : "people-outline"}
              color={color}
            />
          ),
        }}
      />
      {/* My Trips tab - only visible for drivers */}
      <Tabs.Screen
        name="trips/index"
        options={{
          title: "My Trips",
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={28}
              name={focused ? "car" : "car-outline"}
              color={color}
            />
          ),
        }}
      />
      {/* Profile tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={28}
              name={focused ? "person" : "person-outline"}
              color={color}
            />
          ),
        }}
      />
      {/* Hide unused screens and nested routes from tab bar */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trips/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trips/create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trips/requests-swipe"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trips/requests"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trips/[id]/drive"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
};

export default function AppLayout() {
  return (
    <RequireLocation>
      <LocationProvider>
        <AppRoutes />
      </LocationProvider>
    </RequireLocation>
  );
}
