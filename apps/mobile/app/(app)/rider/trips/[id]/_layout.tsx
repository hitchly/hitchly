import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/useStackOptions";

export default function RiderTripsDetailsLayout() {
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
        name="ride"
        options={{
          headerShown: false,
          // Prevents swipe-to-go-back during an active ride to avoid accidental cancellations
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
