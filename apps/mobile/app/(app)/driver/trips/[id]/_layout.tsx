import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/useStackOptions";

export default function DriverTripsDetailsLayout() {
  const stackOptions = useStackOptions();

  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: "Trip Details",
        }}
      />

      <Stack.Screen
        name="requests"
        options={{
          title: "Manage Requests",
          presentation: "modal",
        }}
      />

      <Stack.Screen
        name="drive"
        options={{
          headerShown: false,
          // Prevents swipe-to-go-back during an active drive to avoid accidental cancellations
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
