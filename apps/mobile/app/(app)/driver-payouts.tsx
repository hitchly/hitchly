import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../context/theme-context";
import { trpc } from "../../lib/trpc";

export default function DriverPayoutsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Fetch Connect account status
  const {
    data: connectStatus,
    isLoading: statusLoading,
    refetch,
  } = trpc.payment.getConnectStatus.useQuery();

  // Fetch driver payout history
  const { data: payoutHistory } =
    trpc.payment.getDriverPayoutHistory.useQuery();

  // Create onboarding link mutation
  const createOnboarding = trpc.payment.createConnectOnboarding.useMutation({
    onSuccess: async (data) => {
      // Open onboarding in an in-app browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.onboardingUrl,
        "hitchly://stripe-callback"
      );

      // Refresh status when user returns (regardless of how they return)
      if (result.type === "success" || result.type === "dismiss") {
        refetch();
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleSetupPayouts = async () => {
    // Stripe requires valid HTTPS URLs for return/refresh
    // The webhook handles status updates - these URLs are just for Stripe validation
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "https://hitchly.app";

    createOnboarding.mutate({
      returnUrl: `${baseUrl}/stripe/return`,
      refreshUrl: `${baseUrl}/stripe/refresh`,
    });
  };

  const getStatusColor = () => {
    if (!connectStatus?.hasAccount) return colors.textSecondary;
    if (connectStatus.payoutsEnabled) return colors.success;
    if (connectStatus.onboardingComplete) return colors.warning || "#f59e0b";
    return colors.primary;
  };

  const getStatusText = () => {
    if (!connectStatus?.hasAccount) return "Not Set Up";
    if (connectStatus.payoutsEnabled) return "Active";
    if (connectStatus.onboardingComplete) return "Under Review";
    return "Onboarding Required";
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    if (!connectStatus?.hasAccount) return "alert-circle-outline";
    if (connectStatus.payoutsEnabled) return "checkmark-circle";
    if (connectStatus.onboardingComplete) return "time-outline";
    return "alert-circle-outline";
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Payouts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        {statusLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons
                name={getStatusIcon()}
                size={32}
                color={getStatusColor()}
              />
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Payout Status</Text>
                <Text style={[styles.statusValue, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
            </View>

            {/* Detailed Status */}
            {connectStatus?.hasAccount && (
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Onboarding Complete</Text>
                  <Ionicons
                    name={
                      connectStatus.onboardingComplete
                        ? "checkmark-circle"
                        : "close-circle"
                    }
                    size={20}
                    color={
                      connectStatus.onboardingComplete
                        ? colors.success
                        : colors.textSecondary
                    }
                  />
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payouts Enabled</Text>
                  <Ionicons
                    name={
                      connectStatus.payoutsEnabled
                        ? "checkmark-circle"
                        : "close-circle"
                    }
                    size={20}
                    color={
                      connectStatus.payoutsEnabled
                        ? colors.success
                        : colors.textSecondary
                    }
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Action Button */}
        {!connectStatus?.payoutsEnabled && (
          <TouchableOpacity
            style={styles.setupButton}
            onPress={handleSetupPayouts}
            disabled={createOnboarding.isPending}
          >
            {createOnboarding.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="wallet-outline" size={24} color="#fff" />
                <Text style={styles.setupButtonText}>
                  {connectStatus?.hasAccount
                    ? "Complete Payout Setup"
                    : "Set Up Payouts"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Refresh Button */}
        {connectStatus?.hasAccount && !connectStatus.payoutsEnabled && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => refetch()}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How Payouts Work</Text>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Earn money for every ride you complete
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              Payouts are processed automatically via Stripe
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              Your banking information is secure with Stripe
            </Text>
          </View>
        </View>

        {/* Earnings Summary */}
        {connectStatus?.payoutsEnabled && payoutHistory && (
          <View style={styles.earningsCard}>
            <Text style={styles.infoTitle}>Earnings Summary</Text>
            <View style={styles.earningsRow}>
              <View style={styles.earningsStat}>
                <Text style={styles.earningsAmount}>
                  $
                  {(
                    (payoutHistory.summary.totalEarningsCents || 0) / 100
                  ).toFixed(2)}
                </Text>
                <Text style={styles.earningsLabel}>Total Earnings</Text>
              </View>
              <View style={styles.earningsStat}>
                <Text
                  style={[
                    styles.earningsAmount,
                    { color: colors.warning || "#f59e0b" },
                  ]}
                >
                  $
                  {((payoutHistory.summary.pendingCents || 0) / 100).toFixed(2)}
                </Text>
                <Text style={styles.earningsLabel}>Pending</Text>
              </View>
              <View style={styles.earningsStat}>
                <Text style={styles.earningsAmount}>
                  {payoutHistory.summary.transactionCount || 0}
                </Text>
                <Text style={styles.earningsLabel}>Trips</Text>
              </View>
            </View>
          </View>
        )}

        {/* Transaction History */}
        {connectStatus?.payoutsEnabled &&
          payoutHistory &&
          payoutHistory.payments.length > 0 && (
            <View style={styles.historyCard}>
              <Text style={styles.infoTitle}>Recent Transactions</Text>
              {payoutHistory.payments.slice(0, 10).map((payment) => (
                <View key={payment.id} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionRider}>
                      {payment.riderName}
                    </Text>
                    <Text style={styles.transactionRoute} numberOfLines={1}>
                      {payment.origin?.split(",")[0]} →{" "}
                      {payment.destination?.split(",")[0]}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {payment.capturedAt
                        ? new Date(payment.capturedAt).toLocaleDateString()
                        : "Pending"}
                    </Text>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>
                      +${(payment.driverAmountCents / 100).toFixed(2)}
                    </Text>
                    <Text style={styles.transactionFee}>
                      -{(payment.platformFeeCents / 100).toFixed(2)} fee
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

        {/* Empty History State */}
        {connectStatus?.payoutsEnabled &&
          payoutHistory?.payments.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Complete rides to start earning!
              </Text>
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    statusInfo: {
      marginLeft: 16,
    },
    statusLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statusValue: {
      fontSize: 20,
      fontWeight: "700",
      marginTop: 2,
    },
    detailsSection: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.text,
    },
    setupButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    setupButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    refreshButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    },
    refreshButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "500",
      marginLeft: 8,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    infoItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 12,
      flex: 1,
    },
    earningsCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    earningsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    earningsStat: {
      alignItems: "center",
      flex: 1,
    },
    earningsAmount: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.success,
    },
    earningsLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    historyCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    transactionItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    transactionLeft: {
      flex: 1,
    },
    transactionRight: {
      alignItems: "flex-end",
    },
    transactionRider: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    transactionRoute: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    transactionDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.success,
    },
    transactionFee: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 32,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
