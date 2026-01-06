import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerBackground: () => null,
        headerTitle: "",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen name="sign-in" />

      <Stack.Screen name="sign-up" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
