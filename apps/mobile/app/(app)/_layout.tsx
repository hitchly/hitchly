import { RequireLocation } from "@/components/location/require-location";
import { LocationProvider } from "@/context/location-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

const AppRoutes = () => {
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
