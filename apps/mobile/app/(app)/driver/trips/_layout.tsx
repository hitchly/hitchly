import { Stack } from "expo-router";

export default function DriverTripsLayout() {
  return (
    <Stack>
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
