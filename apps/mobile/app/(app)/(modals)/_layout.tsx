import { Stack } from "expo-router";

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ presentation: "modal" }}>
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
