import { formatTripDateTime, shortenAddress } from "@hitchly/utils";
import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import {
  formatNextTripLine,
  formatRecurringDaysLabel,
} from "@/features/trips/utils/recurringTripLabels";
import type { RouterOutputs } from "@/lib/trpc";

type Trip = RouterOutputs["trip"]["getTrips"][number] & {
  recurringDaysOfWeek?: number[] | null;
};

interface DriverTripCardProps {
  trip: Trip;
  onPress: () => void;
}

const formatLocation = (loc: string) => shortenAddress(loc);

export function DriverTripCard({ trip, onPress }: DriverTripCardProps) {
  const { colors } = useTheme();

  const rawDate = trip.departureTime;
  const departureDate = rawDate ? new Date(rawDate) : null;
  const availableSeats = trip.maxSeats - trip.bookedSeats;
  const isRecurring = Boolean(trip.recurringScheduleId);
  const showRecurringMeta = isRecurring && trip.status !== "completed";
  const recurringSubtitle = showRecurringMeta
    ? formatRecurringDaysLabel(trip.recurringDaysOfWeek)
    : null;
  const nextTripLine = showRecurringMeta
    ? formatNextTripLine(trip.departureTime)
    : null;

  return (
    <Card style={styles.cardSpacing} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.routeContainer}>
          <Text variant="bodySemibold" numberOfLines={1}>
            {formatLocation(trip.origin)}
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            style={styles.arrow}
          >
            →
          </Text>
          <Text variant="bodySemibold" numberOfLines={1}>
            {formatLocation(trip.destination)}
          </Text>
        </View>
        <View style={styles.headerChips}>
          {isRecurring && <Chip label="RECURRING" />}
          <Chip
            label={trip.status.toUpperCase().replace("_", " ")}
            active={trip.status === "active" || trip.status === "in_progress"}
          />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Text variant="caption" color={colors.textSecondary}>
            {departureDate
              ? showRecurringMeta
                ? (nextTripLine ?? formatTripDateTime(departureDate))
                : formatTripDateTime(departureDate)
              : "Time TBD"}
          </Text>
          {recurringSubtitle && (
            <Text
              variant="caption"
              color={colors.textSecondary}
              style={styles.recurringSubtitle}
            >
              🔁 {recurringSubtitle}
            </Text>
          )}
        </View>
        <Text variant="caption" color={colors.textSecondary}>
          {availableSeats} seat{availableSeats !== 1 ? "s" : ""} left
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardSpacing: { marginBottom: 16, gap: 12 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  routeContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    flexWrap: "wrap",
  },
  arrow: { marginHorizontal: 6 },
  headerChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    flexShrink: 1,
  },
  recurringSubtitle: {
    opacity: 0.9,
  },
});
