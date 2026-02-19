import { formatCurrency } from "@hitchly/utils";
import { StyleSheet, View } from "react-native";

import { InfoCard } from "@/components/ui/card/InfoCard";
import { InfoRow } from "@/components/ui/card/InfoRow";
import type { RouterOutputs } from "@/lib/trpc";

type DriverEarnings = RouterOutputs["profile"]["getDriverEarnings"];

interface EarningsSectionProps {
  earnings: DriverEarnings;
}

export function EarningsSection({ earnings }: EarningsSectionProps) {
  return (
    <InfoCard title="Earnings Summary">
      <View style={styles.container}>
        <View style={styles.row}>
          <InfoRow
            label="Lifetime"
            value={formatCurrency(earnings.totals.lifetimeCents)}
          />
          <InfoRow
            label="This Month"
            value={formatCurrency(earnings.totals.monthCents)}
          />
        </View>

        <View style={styles.row}>
          <InfoRow
            label="This Week"
            value={formatCurrency(earnings.totals.weekCents)}
          />
          <InfoRow
            label="Avg / Trip"
            value={formatCurrency(earnings.stats.avgPerTripCents)}
          />
        </View>

        <InfoRow
          label="Completed Trips"
          value={earnings.stats.completedTripCount.toString()}
          fullWidth
        />
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
