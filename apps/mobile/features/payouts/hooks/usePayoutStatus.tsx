import * as WebBrowser from "expo-web-browser";
import { WebBrowserResultType } from "expo-web-browser";
import { Alert } from "react-native";

import { useTheme } from "@/context/theme-context";
import { trpc } from "@/lib/trpc";

export function usePayoutStatus() {
  const { colors } = useTheme();
  const utils = trpc.useUtils();

  const { data: connectStatus, isLoading: statusLoading } =
    trpc.payment.getConnectStatus.useQuery();
  const { data: payoutHistory, isLoading: historyLoading } =
    trpc.payment.getDriverPayoutHistory.useQuery();

  const createOnboarding = trpc.payment.createConnectOnboarding.useMutation({
    onSuccess: async (data) => {
      const result = await WebBrowser.openAuthSessionAsync(
        data.onboardingUrl,
        "hitchly://stripe-callback"
      );

      if (
        result.type === "success" ||
        result.type === WebBrowserResultType.DISMISS
      ) {
        await utils.payment.getConnectStatus.invalidate();
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleSetupPayouts = () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "https://hitchly.app";
    createOnboarding.mutate({
      returnUrl: `${baseUrl}/stripe/return`,
      refreshUrl: `${baseUrl}/stripe/refresh`,
    });
  };

  const refreshStatus = () => {
    void utils.payment.getConnectStatus.invalidate();
  };

  // Derived Status Config
  const getStatusConfig = () => {
    if (!connectStatus?.hasAccount) {
      return {
        color: colors.textSecondary,
        text: "Not Set Up",
        icon: "alert-circle-outline" as const,
      };
    }
    if (connectStatus.payoutsEnabled) {
      return {
        color: colors.success,
        text: "Active",
        icon: "checkmark-circle" as const,
      };
    }
    if (connectStatus.onboardingComplete) {
      return {
        color: colors.warning,
        text: "Under Review",
        icon: "time-outline" as const,
      };
    }
    return {
      color: colors.primary,
      text: "Onboarding Required",
      icon: "alert-circle-outline" as const,
    };
  };

  return {
    connectStatus,
    payoutHistory,
    isLoading: statusLoading || historyLoading,
    isProcessing: createOnboarding.isPending,
    status: getStatusConfig(),
    handleSetupPayouts,
    refreshStatus,
  };
}
