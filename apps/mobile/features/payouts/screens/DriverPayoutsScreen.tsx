import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
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
    return <Skeleton text="Loading Payouts..." />;
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
                ? "Complete Payout Setup"
                : "Set Up Payouts"
            }
            onPress={handleSetupPayouts}
            isLoading={isProcessing}
            variant="primary"
            style={styles.actionButton}
          />
        )}

        {connectStatus?.payoutsEnabled && payoutHistory && (
          <View style={styles.dataSection}>
            <EarningsSummary
              totalCents={payoutHistory.summary.totalEarningsCents}
              pendingCents={payoutHistory.summary.pendingCents}
              count={payoutHistory.summary.transactionCount}
            />
            <TransactionHistory payments={payoutHistory.payments} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerSection: { marginBottom: 24, gap: 4 },
  actionButton: { marginTop: 8 },
  dataSection: { marginTop: 12, gap: 24 },
});
