import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

/**
 * useSignOut
 * Comprehensive hook to handle session termination, cache purging,
 * and safe redirection to the authentication group.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
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
