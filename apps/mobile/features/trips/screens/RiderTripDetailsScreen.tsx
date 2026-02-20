import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormSection } from "@/components/ui/FormSection";
import { IconBox } from "@/components/ui/IconBox";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useRiderTripDetails } from "@/features/trips/hooks/useRiderTripDetails";

const formatLocation = (loc: string) => loc.split(",")[0] ?? "Unknown";

export function RiderTripDetailsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    trip,
    isLoading,
    userRequest,
    riderEtaDetails,
    cancelTripRequest,
    handleCancelRequest,
  } = useRiderTripDetails();

  if (isLoading) return <Skeleton text="FETCHING TRIP..." />;

  if (!trip) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centered}>
          <IconBox name="warning" variant="subtle" size={32} />
          <Text variant="h3">TRIP NOT FOUND</Text>
          <Button
            title="GO BACK"
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

  const departureDate = trip.departureTime
    ? new Date(trip.departureTime)
    : null;
  const isPendingOrAccepted =
    userRequest?.status === "pending" || userRequest?.status === "accepted";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header with Back & Status */}
        <View style={styles.headerRow}>
          <Badge
            label={
              userRequest
                ? `REQUEST: ${userRequest.status.toUpperCase()}`
                : trip.status.toUpperCase()
            }
            variant={
              userRequest?.status === "accepted" ? "success" : "secondary"
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

        {riderEtaDetails && (
          <FormSection title="LIVE UPDATE">
            <Card
              style={[
                styles.cardPadding,
                {
                  borderColor: colors.border,
                  borderLeftWidth: 4,
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <View style={styles.etaHeader}>
                <Ionicons name="flash" size={14} color={colors.primary} />
                <Text
                  variant="captionSemibold"
                  style={{ color: colors.primary }}
                >
                  {riderEtaDetails.title.toUpperCase()}
                </Text>
              </View>
              <Text variant="bodySemibold" style={styles.etaMessage}>
                {riderEtaDetails.message}
              </Text>
            </Card>
          </FormSection>
        )}

        <FormSection title="TRIP INFO">
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
                DRIVER
              </Text>
              <View style={styles.driverRow}>
                <Ionicons
                  name="person-circle"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text variant="bodySemibold">HITCHLY DRIVER</Text>
              </View>
            </View>
          </Card>
        </FormSection>

        {/* Improved Minimalist Actions */}
        <View style={styles.actionsContainer}>
          {(userRequest?.status === "accepted" ||
            userRequest?.status === "on_trip") && (
            <Button
              title="ENTER LIVE PORTAL"
              icon="expand"
              size="lg"
              onPress={() => {
                router.push(`/(app)/rider/trips/${trip.id}/ride` as Href);
              }}
            />
          )}

          {riderEtaDetails &&
            (trip.status === "active" || trip.status === "in_progress") && (
              <View style={styles.safetyRow}>
                <Button
                  title="SAFETY"
                  variant="secondary"
                  icon="shield-checkmark"
                  style={styles.flex1}
                  onPress={() => {
                    router.push(
                      `/(app)/(modals)/safety?tripId=${trip.id}` as Href
                    );
                  }}
                />
                <Button
                  title="MAPS"
                  variant="secondary"
                  icon="navigate"
                  style={styles.flex1}
                  onPress={() => {
                    /* Maps logic */
                  }}
                />
              </View>
            )}

          {trip.status === "completed" && (
            <Button
              title="LEAVE REVIEW"
              variant="secondary"
              icon="star"
              onPress={() => {
                router.push(`/(app)/(modals)/review?tripId=${trip.id}` as Href);
              }}
            />
          )}

          {isPendingOrAccepted && (
            <Button
              title="CANCEL REQUEST"
              variant="ghost"
              isLoading={cancelTripRequest.isPending}
              onPress={handleCancelRequest}
              style={styles.cancelBtn}
              textStyle={{ color: colors.textSecondary, fontSize: 13 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  cardPadding: { padding: 20 },
  noPaddingCard: { padding: 0 },
  routeRow: { flexDirection: "row", gap: 20 },
  timeline: { alignItems: "center", width: 12, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOutline: { backgroundColor: "transparent", borderWidth: 1.5 },
  line: { width: 1, flex: 1, marginVertical: 4 },
  locationContainer: { flex: 1, gap: 24 },
  locationItem: { gap: 4 },
  etaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  etaMessage: { fontSize: 16 },
  detailItem: { padding: 16, gap: 4 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  separator: { height: 1, width: "100%" },
  actionsContainer: { gap: 12, marginTop: 8 },
  safetyRow: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  cancelBtn: { marginTop: 8, opacity: 0.8 },
});
