import { Stack } from "expo-router";

export default function DriverEarningsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Earnings & Payouts",
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
