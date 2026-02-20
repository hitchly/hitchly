import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface PayoutStatusProps {
  status: { color: string; text: string; icon: keyof typeof Ionicons.glyphMap };
  connectStatus?: {
    hasAccount: boolean;
    onboardingComplete: boolean;
    payoutsEnabled: boolean;
  } | null;
}

export function PayoutStatus({ status, connectStatus }: PayoutStatusProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={status.icon} size={32} color={status.color} />
        <View>
          <Text variant="label" color={colors.textSecondary}>
            Payout Status
          </Text>
          <Text variant="h2" color={status.color}>
            {status.text}
          </Text>
        </View>
      </View>

      {connectStatus?.hasAccount && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <StatusRow
            label="Onboarding Complete"
            isActive={connectStatus.onboardingComplete}
          />
          <StatusRow
            label="Payouts Enabled"
            isActive={connectStatus.payoutsEnabled}
          />
        </View>
      )}
    </Card>
  );
}

function StatusRow({ label, isActive }: { label: string; isActive: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="body" color={colors.textSecondary}>
        {label}
      </Text>
      <Ionicons
        name={isActive ? "checkmark-circle" : "close-circle"}
        size={20}
        color={isActive ? colors.success : colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 16 },
  footer: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, gap: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
});
