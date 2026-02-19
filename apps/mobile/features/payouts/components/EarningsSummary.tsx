import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface Props {
  totalCents: number;
  pendingCents: number;
  count: number;
}

export function EarningsSummary({ totalCents, pendingCents, count }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text variant="h3" style={styles.title}>
        Earnings Summary
      </Text>
      <View style={styles.row}>
        <StatItem
          label="Total Earned"
          value={`$${(totalCents / 100).toFixed(2)}`}
          color={colors.success}
        />
        <StatItem
          label="Pending"
          value={`$${(pendingCents / 100).toFixed(2)}`}
          color={colors.warning}
        />
        <StatItem label="Trips" value={count.toString()} color={colors.text} />
      </View>
    </View>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.amount, { color }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginVertical: 12 },
  title: { marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  amount: { fontSize: 20, fontWeight: "700" },
  label: { fontSize: 12, marginTop: 4 },
});
