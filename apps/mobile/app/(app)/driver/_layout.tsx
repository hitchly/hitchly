import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useTabsOptions } from "@/hooks/useNavigationOptions";

export default function DriverTabsLayout() {
  const tabsOptions = useTabsOptions();

  return (
    <Tabs screenOptions={tabsOptions}>
      <Tabs.Screen
        name="index" // Home
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "navigate-circle" : "navigate-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Trips",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      {/* Hide driver/requests stack from the tab bar, keep it addressable via navigation */}
      <Tabs.Screen
        name="requests"
        options={{
          // Hide the requests stack from the tab bar; Home/Trips/Account are the only visible tabs.
          href: null,
        }}
      />
    </Tabs>
  );
}
