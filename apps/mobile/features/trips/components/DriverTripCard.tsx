import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import type { RouterOutputs } from "@/lib/trpc";

type Trip = RouterOutputs["trip"]["getTrips"][number];

interface DriverTripCardProps {
  trip: Trip;
  onPress: () => void;
}

const formatLocation = (loc: string) => loc.split(",")[0] ?? loc;

export function DriverTripCard({ trip, onPress }: DriverTripCardProps) {
  const { colors } = useTheme();

  const rawDate = trip.departureTime;
  const departureDate = rawDate ? new Date(rawDate) : null;
  const availableSeats = trip.maxSeats - trip.bookedSeats;

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
        <Chip
          label={trip.status.toUpperCase().replace("_", " ")}
          active={trip.status === "active" || trip.status === "in_progress"}
        />
      </View>

      <View style={styles.cardFooter}>
        <Text variant="caption" color={colors.textSecondary}>
          {departureDate
            ? `${departureDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })} at ${departureDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Time TBD"}
        </Text>
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
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
});
