import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "react-native";

import { usePushNotifications } from "@/features/notifications/hooks/usePushNotifications";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

/**
 * useSignOut
 * Comprehensive hook to handle session termination, cache purging,
 * push token invalidation, and safe redirection to the authentication group.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // 1. Retrieve the current device's push token
  const { expoPushToken } = usePushNotifications();

  // 2. Setup the mutation to delete the token from the Postgres database
  const { mutateAsync: removePushToken } =
    trpc.notifications.removePushToken.useMutation();

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);

    try {
      // 3. BEST EFFORT: Invalidate the push token for this specific device FIRST.
      // Wrapped in its own try/catch so a network failure doesn't trap the user in the app.
      if (expoPushToken) {
        try {
          await removePushToken({ token: expoPushToken });
        } catch (tokenError) {
          // eslint-disable-next-line no-console
          console.error(
            "Failed to remove push token during sign out:",
            tokenError
          );
        }
      }

      // 4. Destroy the authentication session
      await authClient.signOut();

      // 5. Purge local client state
      queryClient.clear();
      await utils.invalidate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", error);
      Alert.alert(
        "Sign Out Failed",
        "We couldn't sign you out. Please check your connection and try again."
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  return {
    handleSignOut,
    isSigningOut,
  };
}
