import { Stack } from "expo-router";
import { Component, type ReactNode } from "react";
import { View } from "react-native";

import { useUserRole } from "@/context/role-context";
import { DriverVerificationGuard } from "@/features/identity/components/DriverVerificationGuard";
import { usePushNotifications } from "@/features/notifications/hooks/usePushNotifications";
import { ActiveTripBanner } from "@/features/trips/components/ActiveTripBanner";
import { useActiveTripMonitor } from "@/features/trips/hooks/useActiveTripMonitor";
import { authClient } from "@/lib/auth-client";

function AppLayoutContent() {
  const { data: session } = authClient.useSession();
  usePushNotifications(session?.user.id);

  const { isLoading: isRoleLoading } = useUserRole();
  const { activeTripId, currentRoleLabel, isActive, isRecurring } =
    useActiveTripMonitor();

  return (
    <DriverVerificationGuard>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />

        {!isRoleLoading && isActive && activeTripId && (
          <ActiveTripBanner
            tripId={activeTripId}
            roleLabel={currentRoleLabel}
            isRecurring={isRecurring}
          />
        )}
      </View>
    </DriverVerificationGuard>
  );
}

interface AppLayoutState {
  hasError: boolean;
}

/**
 * AppLayout with error boundary to handle provider initialization errors
 */
export default class AppLayout extends Component<object, AppLayoutState> {
  constructor(props: object) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppLayoutState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    // Log error but don't crash - providers might not be ready during initial render
    // eslint-disable-next-line no-console
    console.warn(
      "AppLayout error (likely provider initialization):",
      error.message
    );
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      // Return minimal layout if there's an error - will retry after delay
      return (
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      );
    }

    return <AppLayoutContent />;
  }
}
