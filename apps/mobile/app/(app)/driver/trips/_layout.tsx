import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/useStackOptions";

export default function DriverTripsLayout() {
  const stackOptions = useStackOptions();

  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Trip History",
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
