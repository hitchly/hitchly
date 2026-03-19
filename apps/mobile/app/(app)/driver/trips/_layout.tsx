import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/useNavigationOptions";

/** Ensure tapping "Trips" tab shows the list (My Trips), not Create Trip. */
export const unstable_settings = {
  initialRouteName: "index",
};

export default function DriverTripsLayout() {
  const stackOptions = useStackOptions();

  return (
    <Stack screenOptions={stackOptions} initialRouteName="index">
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: "My Trips",
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          title: "Trip Details",
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: false,
          title: "Create Trip",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
