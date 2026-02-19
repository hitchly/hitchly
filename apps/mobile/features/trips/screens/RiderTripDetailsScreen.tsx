import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Skeleton text="FETCHING TRIP..." />
      </View>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centered}>
          <IconBox
            name="warning-outline"
            variant="error"
            size={24}
            style={styles.errorIcon}
          />
          <Text variant="bodySemibold" style={styles.errorText}>
            TRIP NOT FOUND
          </Text>
          <Button
            title="GO BACK"
            variant="secondary"
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
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
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
                    { borderColor: colors.textSecondary },
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
                { borderColor: colors.primary, borderWidth: 1.5 },
              ]}
            >
              <View style={styles.etaHeader}>
                <IconBox
                  name="time-outline"
                  variant="contrast"
                  size={16}
                  style={styles.etaIcon}
                />
                <Text variant="bodySemibold">
                  {riderEtaDetails.title.toUpperCase()}
                </Text>
              </View>
              <Text
                variant="body"
                color={colors.textSecondary}
                style={styles.etaMessage}
              >
                {riderEtaDetails.message}
              </Text>
              {riderEtaDetails.sub && (
                <Text
                  variant="mono"
                  color={colors.textTertiary}
                  style={styles.subText}
                >
                  {riderEtaDetails.sub}
                </Text>
              )}
            </Card>
          </FormSection>
        )}

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
                DRIVER
              </Text>
              <View style={styles.driverRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={colors.text}
                />
                <Text variant="bodySemibold">HITCHLY DRIVER</Text>
              </View>
            </View>
          </Card>
        </FormSection>

        <View style={styles.actionsContainer}>
          {(userRequest?.status === "accepted" ||
            userRequest?.status === "on_trip") && (
            <Button
              title="OPEN LIVE TRIP"
              icon="map-outline"
              onPress={() => {
                router.push(`/(app)/rider/trips/${trip.id}/ride` as Href);
              }}
            />
          )}

          {riderEtaDetails &&
            (trip.status === "active" || trip.status === "in_progress") && (
              <View style={styles.safetyRow}>
                <Button
                  title="EMERGENCY"
                  variant="danger"
                  size="md"
                  style={styles.halfBtn}
                  onPress={() => {
                    router.push(
                      `/(app)/(modals)/safety?mode=emergency&tripId=${trip.id}` as Href
                    );
                  }}
                />
                <Button
                  title="REPORT"
                  variant="secondary"
                  size="md"
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
              title="LEAVE REVIEW & TIP"
              icon="star-outline"
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
              textStyle={{ color: colors.error }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
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
  cardPadding: { padding: 20 },
  noPaddingCard: { padding: 0 },
  routeRow: { flexDirection: "row", gap: 20 },
  timeline: { alignItems: "center", width: 12, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOutline: { backgroundColor: "transparent", borderWidth: 2 },
  line: { width: 1, flex: 1, marginVertical: 4 },
  locationContainer: { flex: 1, gap: 24 },
  locationItem: { gap: 4 },
  etaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  etaIcon: { width: 24, height: 24, borderRadius: 6 },
  etaMessage: { lineHeight: 20 },
  subText: { marginTop: 8 },
  detailItem: { padding: 16, gap: 4 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  separator: { height: 1, width: "100%" },
  actionsContainer: { gap: 12, marginTop: 12 },
  safetyRow: { flexDirection: "row", gap: 12 },
  halfBtn: { flex: 1 },
});
