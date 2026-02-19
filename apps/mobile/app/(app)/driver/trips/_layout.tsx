import { Stack } from "expo-router";

import { useTheme } from "@/context/theme-context";

export default function DriverTripsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
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
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
