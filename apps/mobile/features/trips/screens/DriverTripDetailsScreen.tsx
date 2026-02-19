import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormSection } from "@/components/ui/FormSection";
import { IconBox } from "@/components/ui/IconBox";
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
    cancelTrip,
    startTrip,
    canStartRide,
    handleCancel,
    router,
  } = useDriverTripDetails();

  if (isLoading) return <Skeleton text="LOADING TRIP DETAILS..." />;

  if (!trip || !isDriver) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <IconBox
          name="warning-outline"
          variant="subtle"
          size={24}
          style={styles.errorIcon}
        />
        <Text variant="bodySemibold" style={styles.errorText}>
          TRIP NOT FOUND
        </Text>
        <Button
          title="RETURN TO DASHBOARD"
          onPress={() => {
            router.back();
          }}
          variant="secondary"
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
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Badge
          label={trip.status.toUpperCase()}
          variant={
            trip.status === "active" || trip.status === "in_progress"
              ? "default"
              : "secondary"
          }
        />
      </View>

      <FormSection title="ROUTE">
        <Card style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.timeline}>
              <View style={[styles.dot, { backgroundColor: colors.text }]} />
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <View
                style={[
                  styles.dot,
                  styles.dotOutline,
                  { borderColor: colors.text },
                ]}
              />
            </View>
            <View style={styles.locationContainer}>
              <View style={styles.locationItem}>
                <Text variant="label" color={colors.textSecondary}>
                  PICKUP
                </Text>
                <Text variant="bodySemibold">
                  {formatLocation(trip.origin)}
                </Text>
              </View>
              <View style={styles.locationItem}>
                <Text variant="label" color={colors.textSecondary}>
                  DROP-OFF
                </Text>
                <Text variant="bodySemibold">
                  {formatLocation(trip.destination)}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </FormSection>

      <FormSection title="TRIP DETAILS">
        <Card style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <Text variant="label" color={colors.textSecondary}>
              DEPARTURE
            </Text>
            <Text variant="bodySemibold">
              {departureDate
                ?.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
                .toUpperCase()}{" "}
              •{" "}
              {departureDate?.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.detailItem}>
            <Text variant="label" color={colors.textSecondary}>
              CAPACITY
            </Text>
            <Text variant="bodySemibold">
              {trip.maxSeats - trip.bookedSeats} OF {trip.maxSeats} SEATS
              AVAILABLE
            </Text>
          </View>
        </Card>
      </FormSection>

      {trip.requests.length > 0 && (
        <FormSection title={`REQUESTS (${String(trip.requests.length)})`}>
          <Card style={styles.requestCard}>
            <View style={styles.requestContent}>
              <IconBox name="people-outline" variant="subtle" size={18} />
              <Text variant="body" style={{ flex: 1 }}>
                Pending passenger requests
              </Text>
              <Button
                title="MANAGE"
                variant="secondary"
                size="sm"
                onPress={() => {
                  router.push(`/(app)/driver/trips/${trip.id}/requests`);
                }}
              />
            </View>
          </Card>
        </FormSection>
      )}

      <View style={styles.actions}>
        {startRideInfo && (
          <Button
            title={
              startRideInfo.canStart
                ? "START RIDE"
                : startRideInfo.availableAt
                  ? `STARTS AT ${startRideInfo.availableAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "WAITING FOR SCHEDULE"
            }
            onPress={() => {
              if (startRideInfo.canStart) {
                Alert.alert("Start Ride", "Mark this trip as in progress?", [
                  { text: "CANCEL", style: "cancel" },
                  {
                    text: "START",
                    onPress: () => {
                      startTrip.mutate({ tripId: trip.id });
                    },
                  },
                ]);
              }
            }}
            disabled={!startRideInfo.canStart || startTrip.isPending}
            icon="play-outline"
          />
        )}

        {trip.status === "in_progress" && (
          <Button
            title="RESUME NAVIGATION"
            icon="navigate-outline"
            onPress={() => {
              router.push(`/(app)/driver/trips/${trip.id}/drive`);
            }}
          />
        )}

        {trip.status === "completed" && (
          <Button
            title="RATE RIDERS"
            icon="star-outline"
            onPress={() => {
              router.push(`/(app)/driver/trips/${trip.id}/review`);
            }}
          />
        )}

        {canCancel && (
          <Button
            title="CANCEL TRIP"
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
  content: { padding: 20, gap: 24, paddingBottom: 60 },
  header: { alignItems: "flex-start", marginBottom: -8 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorIcon: { width: 48, height: 48, borderRadius: 12 },
  errorText: { marginBottom: 12 },
  routeCard: { padding: 20 },
  routeRow: { flexDirection: "row", gap: 20 },
  timeline: { alignItems: "center", width: 12, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOutline: { backgroundColor: "transparent", borderWidth: 2 },
  line: { width: 1, flex: 1, marginVertical: 4 },
  locationContainer: { flex: 1, gap: 24 },
  locationItem: { gap: 4 },
  detailsCard: { padding: 0 },
  detailItem: { padding: 16, gap: 4 },
  separator: { height: 1, width: "100%", backgroundColor: "#eee" }, // Use theme border color in practice
  requestCard: { padding: 12 },
  requestContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  actions: { gap: 12, marginTop: 12 },
  cancelBtn: { marginTop: 8 },
});
