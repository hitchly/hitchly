import { Ionicons } from "@expo/vector-icons";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useDriverTripDetails } from "@/features/trips/hooks/useDriverTripDetails";

const formatLocation = (loc: string) => loc.split(",")[0] ?? loc;

export function DriverTripDetailsScreen() {
  const { colors } = useTheme();
  const {
    trip,
    isLoading,
    isDriver,
    isTestUser,
    cancelTrip,
    startTrip,
    canStartRide,
    handleCancel,
    router,
  } = useDriverTripDetails();

  if (isLoading) return <Skeleton text="Loading trip details..." />;

  if (!trip || !isDriver) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={48} color={colors.error} />
        <Text variant="h3" style={styles.errorText}>
          Trip not found
        </Text>
        <Button
          title="Go Back"
          onPress={() => {
            router.back();
          }}
        />
      </View>
    );
  }

  const canCancel = trip.status === "pending" || trip.status === "active";
  const startRideInfo = trip.status === "active" ? canStartRide : null;

  const departureDate = trip.departureTime
    ? new Date(trip.departureTime)
    : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.statusSection}>
        <Chip
          label={trip.status.toUpperCase()}
          active={trip.status === "active"}
        />
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text variant="h3" style={styles.sectionTitle}>
          Route
        </Text>

        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View
              style={[styles.routeDot, { backgroundColor: colors.primary }]}
            />
            <Text variant="bodySemibold">{formatLocation(trip.origin)}</Text>
          </View>
          <View
            style={[styles.routeLine, { backgroundColor: colors.border }]}
          />
          <View style={styles.routePoint}>
            <View
              style={[styles.routeDot, { backgroundColor: colors.success }]}
            />
            <Text variant="bodySemibold">
              {formatLocation(trip.destination)}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text variant="h3" style={styles.sectionTitle}>
          Trip Details
        </Text>

        <View style={styles.detailRow}>
          <Text variant="body" color={colors.textSecondary}>
            Departure Date:
          </Text>
          <Text variant="bodySemibold">
            {departureDate
              ? departureDate.toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : "TBD"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="body" color={colors.textSecondary}>
            Departure Time:
          </Text>
          <Text variant="bodySemibold">
            {departureDate
              ? departureDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "TBD"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="body" color={colors.textSecondary}>
            Available Seats:
          </Text>
          <Text variant="bodySemibold">
            {trip.maxSeats - trip.bookedSeats} / {trip.maxSeats}
          </Text>
        </View>
      </View>

      {trip.requests.length > 0 && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text variant="h3" style={styles.sectionTitle}>
            Requests ({trip.requests.length})
          </Text>
          <Button
            title="Manage Requests"
            variant="secondary"
            onPress={() => {
              router.push(`/(app)/driver/trips/${trip.id}/requests`);
            }}
          />
        </View>
      )}

      <View style={styles.actionsContainer}>
        {startRideInfo && (
          <Button
            title={
              startRideInfo.canStart
                ? "Start Ride"
                : startRideInfo.availableAt
                  ? `Starts at ${startRideInfo.availableAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Starts at TBD"
            }
            onPress={() => {
              if (startRideInfo.canStart) {
                Alert.alert(
                  "Start Ride",
                  "Start this ride? This marks the trip as in progress.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Start",
                      onPress: () => {
                        startTrip.mutate({ tripId: trip.id });
                      },
                    },
                  ]
                );
              }
            }}
            disabled={!startRideInfo.canStart || startTrip.isPending}
            style={[!startRideInfo.canStart && { opacity: 0.6 }]}
          />
        )}

        {trip.status === "in_progress" && (
          <Button
            title="Resume Driving Navigation"
            onPress={() => {
              router.push(`/(app)/driver/trips/${trip.id}/drive`);
            }}
          />
        )}

        {isTestUser &&
          (trip.status === "active" || trip.status === "in_progress") && (
            <Button
              title="Test Driver Complete"
              variant="secondary"
              // TODO: Implement Complete
              onPress={() => {
                // eslint-disable-next-line no-console
                console.log("Simulate complete");
              }}
            />
          )}

        {trip.status === "completed" && (
          <Button
            title="Rate Riders"
            onPress={() => {
              router.push(`/(app)/driver/trips/${trip.id}/review`);
            }}
          />
        )}

        {canCancel && (
          <Button
            title="Cancel Trip"
            variant="danger"
            onPress={handleCancel}
            isLoading={cancelTrip.isPending}
            style={styles.cancelBtn}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { marginTop: 16, marginBottom: 24 },
  statusSection: { alignItems: "center", marginVertical: 8 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 16 },
  sectionTitle: { marginBottom: 8 },
  routeContainer: { paddingLeft: 8 },
  routePoint: { flexDirection: "row", alignItems: "center" },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  routeLine: { width: 2, height: 24, marginLeft: 5, marginVertical: 4 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionsContainer: { gap: 12, marginTop: 8 },
  cancelBtn: { marginTop: 12 },
});
