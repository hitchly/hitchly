import { Stack } from "expo-router";
import { View } from "react-native";

import { DriverVerificationGuard } from "@/features/identity/components/DriverVerificationGuard";
import { ActiveTripBanner } from "@/features/trips/components/ActiveTripBanner";
import { useActiveTripMonitor } from "@/features/trips/hooks/useActiveTripMonitor";

export default function AppLayout() {
  const { activeTripId, currentRoleLabel, isActive } = useActiveTripMonitor();

  return (
    <DriverVerificationGuard>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />

        {isActive && activeTripId && (
          <ActiveTripBanner
            tripId={activeTripId}
            roleLabel={currentRoleLabel}
          />
        )}
      </View>
    </DriverVerificationGuard>
  );
}
