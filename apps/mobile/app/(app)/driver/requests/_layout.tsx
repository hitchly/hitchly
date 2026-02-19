import { Stack } from "expo-router";

import { useTheme } from "@/context/theme-context";

export default function DriverRequestsLayout() {
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
          title: "Requests",
        }}
      />
    </Stack>
  );
}
