import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/useNavigationOptions";

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
    </Stack>
  );
}
