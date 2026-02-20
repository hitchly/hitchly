import { Ionicons } from "@expo/vector-icons";
import { type Href } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormSection } from "@/components/ui/FormSection";
import { IconBox } from "@/components/ui/IconBox";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useDriverTripDetails } from "@/features/trips/hooks/useDriverTripDetails";

const formatLocation = (loc: string) => loc.split(",")[0] ?? "Unknown";

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
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centered}>
          <IconBox name="warning" variant="subtle" size={32} />
          <Text variant="h3">TRIP NOT FOUND</Text>
          <Button
            title="RETURN TO DASHBOARD"
            variant="ghost"
            icon="arrow-back"
            onPress={() => {
              router.back();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const canCancel = trip.status === "pending" || trip.status === "active";
  const startRideInfo = trip.status === "active" ? canStartRide : null;
  const departureDate = trip.departureTime
    ? new Date(trip.departureTime)
    : null;
  const pendingRequestsCount = trip.requests.filter(
    (r) => r.status === "pending"
  ).length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Badge
            label={trip.status.toUpperCase()}
            variant={
              trip.status === "active" || trip.status === "in_progress"
                ? "success"
                : "secondary"
            }
          />
        </View>

        <FormSection title="ROUTE">
          <Card style={styles.cardPadding}>
            <View style={styles.routeRow}>
              <View style={styles.timeline}>
                <View style={[styles.dot, { backgroundColor: colors.text }]} />
                <View
                  style={[styles.line, { backgroundColor: colors.border }]}
                />
                <View
                  style={[
                    styles.dot,
                    styles.dotOutline,
                    { borderColor: colors.border },
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
          <Card style={styles.noPaddingCard}>
            <View style={styles.detailItem}>
              <Text variant="label" color={colors.textSecondary}>
                DEPARTURE
              </Text>
              <Text variant="bodySemibold">
                {departureDate
                  ?.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  })
                  .toUpperCase()}{" "}
                •{" "}
                {departureDate?.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
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
          <FormSection title="PASSENGERS">
            <Card style={styles.noPaddingCard}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => {
                  router.push(
                    `/(app)/driver/trips/${trip.id}/requests` as Href
                  );
                }}
              >
                <View style={styles.menuLeft}>
                  <IconBox name="people-outline" variant="subtle" size={20} />
                  <Text variant="bodySemibold">
                    {trip.requests.length} Request
                    {trip.requests.length > 1 ? "s" : ""}
                  </Text>
                  {pendingRequestsCount > 0 && (
                    <Badge
                      label={`${String(pendingRequestsCount)} NEW`}
                      variant="info"
                    />
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </Pressable>
            </Card>
          </FormSection>
        )}

        <View style={styles.actionsContainer}>
          {startRideInfo && (
            <Button
              title={
                startRideInfo.canStart
                  ? "START LIVE TRIP"
                  : startRideInfo.availableAt
                    ? `STARTS AT ${startRideInfo.availableAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "WAITING FOR SCHEDULE"
              }
              icon={startRideInfo.canStart ? "play" : "time"}
              size="lg"
              onPress={() => {
                if (startRideInfo.canStart) {
                  Alert.alert("Start Trip", "Mark this trip as in progress?", [
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
            />
          )}

          {trip.status === "in_progress" && (
            <Button
              title="RESUME NAVIGATION"
              icon="navigate"
              size="lg"
              onPress={() => {
                router.push(`/(app)/driver/trips/${trip.id}/drive` as Href);
              }}
            />
          )}

          {trip.status === "completed" && (
            <Button
              title="RATE RIDERS"
              variant="secondary"
              icon="star"
              onPress={() => {
                router.push(`/(app)/driver/trips/${trip.id}/review` as Href);
              }}
            />
          )}

          {canCancel && (
            <Button
              title="CANCEL TRIP"
              variant="ghost"
              onPress={handleCancel}
              isLoading={cancelTrip.isPending}
              style={styles.cancelBtn}
              textStyle={{ color: colors.error, fontSize: 13 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Base Layout
  container: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  header: { alignItems: "flex-start", marginBottom: -8 },

  // Card Spacing
  cardPadding: { padding: 20 },
  noPaddingCard: { padding: 0, overflow: "hidden" },

  // Route Visualization
  routeRow: { flexDirection: "row", gap: 20 },
  timeline: { alignItems: "center", width: 12, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOutline: { backgroundColor: "transparent", borderWidth: 1.5 },
  line: { width: 1, flex: 1, marginVertical: 4 },
  locationContainer: { flex: 1, gap: 24 },
  locationItem: { gap: 4 },

  // List Rows
  detailItem: { padding: 16, gap: 4 },
  separator: { height: 1, width: "100%" },

  // Menu Item (Passengers)
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Actions
  actionsContainer: { gap: 12, marginTop: 8 },
  cancelBtn: { marginTop: 8, opacity: 0.8 },
});
