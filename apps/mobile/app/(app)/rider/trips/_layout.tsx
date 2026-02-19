import { Stack } from "expo-router";

export default function RiderTripsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "My Trips",
          headerLargeTitle: true, // Looks great on iOS for top-level lists
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Trip Details",
        }}
      />
    </Stack>
  );
}
