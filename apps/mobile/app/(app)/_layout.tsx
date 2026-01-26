import { RequireLocation } from "@/components/location/require-location";
import { LocationProvider } from "@/context/location-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";

const AppRoutes = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const banCheck = trpc.profile.getBanStatus.useQuery(undefined, {
    enabled: !!session?.user?.id,
    refetchOnMount: true,
    retry: false,
  });

  useEffect(() => {
    if (banCheck.data?.isBanned) {
      router.replace("/banned");
    }
  }, [banCheck.data?.isBanned]);

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matchmaking"
        options={{
          title: "Find Ride",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="search" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="person" color={color} />
          ),
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
