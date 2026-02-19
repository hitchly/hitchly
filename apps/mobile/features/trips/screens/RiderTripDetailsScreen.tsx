import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useRiderTripDetails } from "@/features/trips/hooks/useRiderTripDetails";

const formatLocation = (loc: string) => loc.split(",")[0] ?? loc;

export function RiderTripDetailsScreen() {
  const { colors } = useTheme();
  const {
    trip,
    isLoading,
    userRequest,
    riderEtaDetails,
    cancelTripRequest,
    handleCancelRequest,
    router,
  } = useRiderTripDetails();

  if (isLoading) return <Skeleton text="Loading trip details..." />;

  if (!trip) {
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

  const departureDate = trip.departureTime
    ? new Date(trip.departureTime)
    : null;
  const isPendingOrAccepted =
    userRequest?.status === "pending" || userRequest?.status === "accepted";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.statusSection}>
        <Chip
          label={
            userRequest
              ? `Request: ${userRequest.status.toUpperCase()}`
              : trip.status.toUpperCase()
          }
          active={
            trip.status === "active" || userRequest?.status === "accepted"
          }
        />
      </View>

      <Card style={styles.card}>
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
      </Card>

      {riderEtaDetails && (
        <Card style={styles.card}>
          <Text variant="h3" style={styles.sectionTitle}>
            Live Update
          </Text>
          <Text variant="bodySemibold" style={styles.highlightText}>
            {riderEtaDetails.title}
          </Text>
          <Text variant="body" color={colors.textSecondary}>
            {riderEtaDetails.message}
          </Text>
          {riderEtaDetails.sub && (
            <Text
              variant="caption"
              color={colors.textTertiary}
              style={styles.subText}
            >
              {riderEtaDetails.sub}
            </Text>
          )}
        </Card>
      )}

      <Card style={styles.card}>
        <Text variant="h3" style={styles.sectionTitle}>
          Trip Details
        </Text>
        <View style={styles.detailRow}>
          <Text variant="body" color={colors.textSecondary}>
            Departure Date:
          </Text>
          <Text variant="bodySemibold">
            {departureDate
              ? departureDate.toLocaleDateString("en-US", {
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
              ? departureDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "TBD"}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text variant="body" color={colors.textSecondary}>
            Driver:
          </Text>
          {/* TODO: Bind actual driver name when backend query supports it */}
          <Text variant="bodySemibold">Hitchly Driver</Text>
        </View>
      </Card>

      <View style={styles.actionsContainer}>
        {(userRequest?.status === "accepted" ||
          userRequest?.status === "on_trip") && (
          <Button
            title="Open Live Trip Screen"
            onPress={() => {
              // Cast as Href to satisfy Expo Router strict typing
              router.push(
                `/(app)/rider/trips/${trip.id}/ride?referrer=/(app)/rider/trips/${trip.id}` as Href
              );
            }}
          />
        )}

        {riderEtaDetails &&
          (trip.status === "active" || trip.status === "in_progress") && (
            <View style={styles.safetyRow}>
              <Button
                title="Emergency"
                variant="danger"
                style={styles.halfBtn}
                onPress={() => {
                  router.push(
                    `/(app)/(modals)/safety?mode=emergency&tripId=${trip.id}` as Href
                  );
                }}
              />
              <Button
                title="Report"
                variant="secondary"
                style={styles.halfBtn}
                onPress={() => {
                  router.push(
                    `/(app)/(modals)/safety?mode=report&tripId=${trip.id}` as Href
                  );
                }}
              />
            </View>
          )}

        {trip.status === "completed" && (
          <Button
            title="Leave Review & Tip"
            onPress={() => {
              router.push(`/(app)/(modals)/review?tripId=${trip.id}` as Href);
            }}
          />
        )}

        {isPendingOrAccepted && (
          <Button
            title="Cancel Request"
            variant="danger"
            isLoading={cancelTripRequest.isPending}
            onPress={handleCancelRequest}
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
  // Card styles kept for internal gap/padding, but border/background removed since Card handles it natively
  card: { padding: 16, gap: 16 },
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
  highlightText: { marginBottom: 4 },
  subText: { marginTop: 8 },
  actionsContainer: { gap: 12, marginTop: 8 },
  safetyRow: { flexDirection: "row", gap: 12 },
  halfBtn: { flex: 1 },
  cancelBtn: { marginTop: 12 },
});
