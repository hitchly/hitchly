import { formatTripDateTime, shortenAddress } from "@hitchly/utils";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
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
  onRequestNext?: (input: {
    trip: Trip;
    pickupLat: number;
    pickupLng: number;
  }) => Promise<void> | void;
  isRequestingNext?: boolean;
}

const formatLocation = (loc: string) => shortenAddress(loc);

export function RiderTripCard({
  trip,
  currentUserId,
  onPress,
  onRequestNext,
  isRequestingNext = false,
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
  const canRequestNext =
    Boolean(onRequestNext) &&
    Boolean(trip.recurringScheduleId) &&
    trip.status === "completed" &&
    userRequest?.status === "completed" &&
    typeof userRequest.pickupLat === "number" &&
    typeof userRequest.pickupLng === "number";
  const requestNextLabel = departureDate
    ? `REQUEST NEXT ${departureDate
        .toLocaleDateString("en-US", { weekday: "long" })
        .toUpperCase()}`
    : "REQUEST NEXT";

  return (
    <Card style={styles.cardSpacing} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.routeContainer}>
          <Text variant="bodySemibold" numberOfLines={1}>
            {formatLocation(userRequest?.pickupAddress ?? trip.origin)}
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
          {departureDate ? formatTripDateTime(departureDate) : "Time TBD"}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {/* Default to Driver ID or placeholder if name isn't joined yet */}
          Driver: {trip.driver?.name ?? "Hitchly Driver"}
        </Text>
      </View>
      {canRequestNext ? (
        <Button
          title={requestNextLabel}
          size="sm"
          variant="secondary"
          isLoading={isRequestingNext}
          onPress={() => {
            if (!onRequestNext) return;
            void onRequestNext({
              trip,
              pickupLat: userRequest.pickupLat,
              pickupLng: userRequest.pickupLng,
            });
          }}
          style={styles.requestNextButton}
        />
      ) : null}
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
  requestNextButton: {
    marginTop: 4,
  },
});
