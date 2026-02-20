import { Stack } from "expo-router";

import { useStackOptions } from "@/hooks/useNavigationOptions";

export default function ModalsLayout() {
  const stackOptions = useStackOptions();
  return (
    <Stack screenOptions={stackOptions}>
      <Stack.Screen
        name="safety"
        options={{
          title: "Safety",
        }}
      />
      <Stack.Screen
        name="review/[id]"
        options={{
          title: "Review Details",
        }}
      />
      <Stack.Screen
        name="ride"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="drive"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
