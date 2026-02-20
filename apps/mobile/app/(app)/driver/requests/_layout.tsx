import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/useNavigationOptions";

export default function DriverRequestsLayout() {
  const stackOptions = useStackOptions();

  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="swipe"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
