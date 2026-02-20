import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import type { RouterOutputs } from "@/lib/trpc";

type Trip = RouterOutputs["trip"]["getTrips"][number];

interface RiderTripCardProps {
  trip: Trip;
  currentUserId?: string;
  onPress: () => void;
}

const formatLocation = (loc: string) => loc.split(",")[0] ?? loc;

export function RiderTripCard({
  trip,
  currentUserId,
  onPress,
}: RiderTripCardProps) {
  const { colors } = useTheme();

  const rawDate = trip.departureTime;
  const departureDate = rawDate ? new Date(rawDate) : null;

  const userRequest = trip.requests.find(
    (req) => req.riderId === currentUserId
  );
  const requestStatus = (userRequest?.status ?? "unknown").toUpperCase();
  const tripStatus = trip.status.toUpperCase();

  const displayStatus = userRequest ? `REQ: ${requestStatus}` : tripStatus;
  const isActive =
    trip.status === "active" || userRequest?.status === "accepted";

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
        <Chip label={displayStatus.replace("_", " ")} active={isActive} />
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
          {/* Default to Driver ID or placeholder if name isn't joined yet */}
          Driver: {trip.driver?.name ?? "Hitchly Driver"}
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
