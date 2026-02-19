import { Stack } from "expo-router";

import { useTheme } from "@/context/theme-context";

export default function DriverTripsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Trip History",
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Trip Details",
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Create Trip",
          presentation: "modal", // Slides up from the bottom
          headerLeft: () => null, // Often you'll add a custom "Cancel" button here
        }}
      />
    </Stack>
  );
}
