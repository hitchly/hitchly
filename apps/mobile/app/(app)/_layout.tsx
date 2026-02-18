import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Tabs,
  usePathname,
  useRouter,
  useSegments,
  type Href,
} from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { RequireLocation } from "@/features/location/require-location";
import { LocationProvider } from "@/context/location-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

const AppRoutes = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: userProfile } = trpc.profile.getMe.useQuery();

  const rawSegments = useSegments();
  const segments: readonly string[] = rawSegments;

  const pathname = usePathname();

  const banCheck = trpc.profile.getBanStatus.useQuery(undefined, {
    enabled: !!session?.user.id,
    refetchOnMount: true,
    retry: false,
  });

  useEffect(() => {
    if (banCheck.data?.isBanned) {
      router.replace("/banned");
    }
  }, [banCheck.data?.isBanned, router]);

  const appRole = userProfile?.profile.appRole ?? "rider";
  const isDriver = appRole === "driver";
  const isRider = appRole === "rider";

  const discoverScreenName = isDriver ? "requests" : "matchmaking";

  const isOnDriveScreen = segments.includes("drive");
  const isOnRideScreen = segments.includes("ride");

  useEffect(() => {
    if (!userProfile?.profile.appRole) return;
    if (isDriver && pathname === "/matchmaking") {
      router.replace("/requests" as Href);
      return;
    }
    if (isRider && pathname === "/trips") {
      router.replace("/requests" as Href);
      return;
    }
    if (isRider && pathname === "/requests") {
      return;
    }
  }, [isDriver, isRider, pathname, router, userProfile?.profile.appRole]);

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
          display: isOnDriveScreen || isOnRideScreen ? "none" : "flex",
        },
      }}
    >
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
          title: isDriver ? "Passengers" : "My Requests",
          href: undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={28}
              name={focused ? "people" : "people-outline"}
              color={color}
            />
          ),
        }}
      />
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
      <Tabs.Screen
        name="payment-methods"
        options={{
          title: "Payment",
          href: isRider ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={28}
              name={focused ? "card" : "card-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="driver-payouts"
        options={{
          title: "Payouts",
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={28}
              name={focused ? "wallet" : "wallet-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="safety"
        options={{
          title: "Safety",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={28}
              name={focused ? "shield" : "shield-outline"}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="trips/[id]" options={{ href: null }} />
      <Tabs.Screen name="trips/create" options={{ href: null }} />
      <Tabs.Screen name="trips/requests-swipe" options={{ href: null }} />
      <Tabs.Screen name="trips/requests" options={{ href: null }} />
      <Tabs.Screen name="trips/[id]/drive" options={{ href: null }} />
      <Tabs.Screen name="trips/[id]/ride" options={{ href: null }} />
      <Tabs.Screen name="trips/[id]/review" options={{ href: null }} />
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
