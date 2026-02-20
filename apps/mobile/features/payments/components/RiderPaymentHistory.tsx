import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import type { RouterOutputs } from "@/lib/trpc";

type PaymentHistoryItem =
  RouterOutputs["payment"]["getRiderPaymentHistory"]["payments"][number];
type PaymentSummary = NonNullable<
  RouterOutputs["payment"]["getRiderPaymentHistory"]["summary"]
>;

interface RiderPaymentHistoryProps {
  payments: PaymentHistoryItem[];
  summary: PaymentSummary | undefined;
}

export function RiderPaymentHistory({
  payments,
  summary,
}: RiderPaymentHistoryProps) {
  const { colors } = useTheme();

  if (payments.length === 0) {
    return (
      <View style={styles.historyEmpty}>
        <Ionicons
          name="receipt-outline"
          size={40}
          color={colors.textSecondary}
        />
        <Text variant="bodySemibold" style={styles.historyEmptyText}>
          No payments yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="h3" style={styles.sectionTitle}>
        Payment History
      </Text>

      {/* Summary Row */}
      {summary && (
        <Card style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text variant="h2">
              ${((summary.totalSpentCents || 0) / 100).toFixed(2)}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Total Spent
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="h2" color={colors.primary}>
              ${((summary.totalTipsCents || 0) / 100).toFixed(2)}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              Tips
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="h2">{summary.rideCount || 0}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              Rides
            </Text>
          </View>
        </Card>
      )}

      {/* Payment List */}
      <View style={styles.list}>
        {payments.slice(0, 10).map((payment) => (
          <View
            key={payment.id}
            style={[styles.historyItem, { backgroundColor: colors.surface }]}
          >
            <View style={styles.historyLeft}>
              <View
                style={[
                  styles.historyIcon,
                  { backgroundColor: `${colors.primary}20` },
                ]}
              >
                <Ionicons name="car" size={18} color={colors.primary} />
              </View>
              <View style={styles.historyInfo}>
                <Text variant="bodySemibold">{payment.driverName}</Text>
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  numberOfLines={1}
                >
                  {payment.origin.split(",")[0]} →{" "}
                  {payment.destination.split(",")[0]}
                </Text>
                <Text
                  variant="caption"
                  color={colors.textTertiary}
                  style={{ marginTop: 2 }}
                >
                  {payment.capturedAt
                    ? new Date(payment.capturedAt).toLocaleDateString()
                    : new Date(payment.departureTime).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.historyRight}>
              <Text variant="bodySemibold">
                ${(payment.amountCents / 100).toFixed(2)}
              </Text>
              <Text
                variant="caption"
                color={
                  payment.status === "captured"
                    ? colors.success
                    : colors.warning
                }
              >
                {payment.status === "captured" ? "Paid" : "Pending"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  sectionTitle: { marginBottom: 16 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 16,
  },
  summaryItem: { alignItems: "center", flex: 1, gap: 4 },
  list: { gap: 8 },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
  },
  historyLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  historyInfo: { flex: 1 },
  historyRight: { alignItems: "flex-end", gap: 2 },
  historyEmpty: { alignItems: "center", paddingVertical: 32 },
  historyEmptyText: { marginTop: 8 },
});
