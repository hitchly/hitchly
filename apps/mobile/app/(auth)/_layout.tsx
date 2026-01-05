import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="index" />

      <Stack.Screen
        name="sign-in"
        options={{
          headerShown: true,
          headerTitle: "Sign In",
        }}
      />

      <Stack.Screen
        name="sign-up"
        options={{
          headerShown: true,
          headerTitle: "Create Account",
        }}
      />
      <Stack.Screen
        name="verify"
        options={{
          headerShown: true,
          headerTitle: "Verify Email",
        }}
      />
    </Stack>
  );
}
