import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/useStackOptions";

export default function ModalsLayout() {
  const stackOptions = useStackOptions();
  return (
    <Stack
      screenOptions={{
        ...stackOptions,
        presentation: "modal",
        headerLeft: () => null,
      }}
    >
      <Stack.Screen
        name="safety"
        options={{
          title: "Safety Toolkit",
          headerBackVisible: true,
        }}
      />
      <Stack.Screen name="review/[id]" options={{ title: "Leave a Review" }} />
    </Stack>
  );
}
