import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface Payment {
  id: string;
  riderName: string;
  origin: string;
  destination: string;
  capturedAt: string | null;
  driverAmountCents: number;
  platformFeeCents: number;
}

interface Props {
  payments: Payment[];
}

export function TransactionHistory({ payments }: Props) {
  const { colors } = useTheme();

  if (payments.length === 0) {
    return (
      <View
        style={[
          styles.emptyCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name="receipt-outline"
          size={48}
          color={colors.textTertiary}
        />
        <Text variant="h3" style={{ marginTop: 16 }}>
          No transactions yet
        </Text>
        <Text variant="body" color={colors.textSecondary} align="center">
          Complete rides to start earning!
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text variant="h3" style={styles.title}>
        Recent Transactions
      </Text>
      {payments.slice(0, 10).map((payment) => (
        <View
          key={payment.id}
          style={[styles.item, { borderBottomColor: colors.border }]}
        >
          <View style={styles.left}>
            <Text variant="bodySemibold">{payment.riderName}</Text>
            <Text variant="caption" numberOfLines={1}>
              {payment.origin.split(",")[0]} →{" "}
              {payment.destination.split(",")[0]}
            </Text>
            <Text
              variant="caption"
              color={colors.textTertiary}
              style={{ marginTop: 4 }}
            >
              {payment.capturedAt
                ? new Date(payment.capturedAt).toLocaleDateString()
                : "Pending"}
            </Text>
          </View>

          <View style={styles.right}>
            <Text variant="bodySemibold" color={colors.success}>
              +${(payment.driverAmountCents / 100).toFixed(2)}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              -${(payment.platformFeeCents / 100).toFixed(2)} fee
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  title: { marginBottom: 8 },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  left: { flex: 1, gap: 2 },
  right: { alignItems: "flex-end", gap: 2 },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
});
