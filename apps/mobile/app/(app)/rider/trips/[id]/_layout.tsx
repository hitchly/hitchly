import { Stack } from "expo-router";

import { useTheme } from "@/context/theme-context";

export default function RiderTripsDetailsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
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
