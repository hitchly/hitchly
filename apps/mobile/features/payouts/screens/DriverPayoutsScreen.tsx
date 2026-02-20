import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { EarningsSummary } from "@/features/payouts/components/EarningsSummary";
import { PayoutStatus } from "@/features/payouts/components/PayoutStatus";
import { TransactionHistory } from "@/features/payouts/components/TransactionHistory";
import { usePayoutStatus } from "@/features/payouts/hooks/usePayoutStatus";

export function DriverPayoutsScreen() {
  const { colors } = useTheme();
  const {
    connectStatus,
    payoutHistory,
    isLoading,
    isProcessing,
    status,
    handleSetupPayouts,
  } = usePayoutStatus();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Skeleton text="SYNCING FINANCIAL DATA..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PayoutStatus status={status} connectStatus={connectStatus} />

        {!connectStatus?.payoutsEnabled && (
          <Button
            title={
              connectStatus?.hasAccount
                ? "COMPLETE PAYOUT SETUP"
                : "INITIALIZE STRIPE CONNECT"
            }
            onPress={handleSetupPayouts}
            isLoading={isProcessing}
            variant="primary"
            style={styles.actionButton}
          />
        )}

        {connectStatus?.payoutsEnabled && payoutHistory && (
          <View style={styles.dataSection}>
            <View style={styles.sectionHeader}>
              <Text variant="label" color={colors.textSecondary}>
                PERFORMANCE SUMMARY
              </Text>
            </View>

            <EarningsSummary
              totalCents={payoutHistory.summary.totalEarningsCents}
              pendingCents={payoutHistory.summary.pendingCents}
              count={payoutHistory.summary.transactionCount}
            />

            <View style={styles.sectionHeader}>
              <Text variant="label" color={colors.textSecondary}>
                TRANSACTION LEDGER
              </Text>
            </View>

            <TransactionHistory payments={payoutHistory.payments} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24, // Vercel screens usually have generous horizontal padding
    paddingBottom: 60,
  },
  header: {
    marginBottom: 24,
    gap: 4,
  },
  actionButton: {
    marginTop: 16,
    // Button internal styling (8px radius) handled by component
  },
  dataSection: {
    marginTop: 32,
    gap: 16,
  },
  sectionHeader: {
    marginBottom: -4, // Tighter gap for the labels
  },
});
