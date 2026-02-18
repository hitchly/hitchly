import { Stack } from "expo-router";

import { useTheme } from "@/context/theme-context";

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerBackTitle: "Back",
        headerTitle: "",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sign-in"
        options={{
          headerTitle: "Sign In",
          headerTitleAlign: "center",
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          headerTitle: "Sign Up",
          headerTitleAlign: "center",
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="verify"
        options={{
          headerTitle: "Verify",
          headerTitleAlign: "center",
          headerTransparent: true,
        }}
      />
    </Stack>
  );
}
