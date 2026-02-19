import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/useStackOptions";

export default function RiderTripsLayout() {
  const stackOptions = useStackOptions();

  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: "Trips",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
