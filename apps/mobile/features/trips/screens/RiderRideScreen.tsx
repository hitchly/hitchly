import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormSection } from "@/components/ui/FormSection";
import { IconBox } from "@/components/ui/IconBox";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useRideTrip } from "@/features/trips/hooks/useRideTrip";

export function RiderRideScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const {
    isLoading,
    tripMissing,
    isAccepted,
    isOnTrip,
    isCompleted,
    pickupConfirmed,
    statusInfo,
    liveDriverInfo,
    isConfirming,
    actions,
  } = useRideTrip(tripId);

  useEffect(() => {
    if (isCompleted && tripId) {
      const timeout = setTimeout(() => {
        router.replace(`/(app)/(modals)/review/${tripId}` as Href);
      }, 1500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [tripId, isCompleted, router]);

  const handleClose = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View style={styles.content}>
          <Skeleton text="Loading Trip..." />
        </View>
      </SafeAreaView>
    );
  }

  if (tripMissing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.pulseDot, { backgroundColor: colors.text }]} />
            <Text variant="h3">Trip Error</Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.5 },
            ]}
            hitSlop={10}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.centerContent}>
          <IconBox
            name="warning-outline"
            variant="error"
            size={32}
            style={styles.iconBox}
          />
          <Text variant="h2" style={styles.emptyTitle}>
            NOT FOUND
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            align="center"
            style={styles.emptySubtext}
          >
            We couldn&apos;t find the details for this ride.
          </Text>
          <Button
            title="GO BACK"
            variant="secondary"
            onPress={handleClose}
            style={styles.actionBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.pulseDot, { backgroundColor: colors.text }]} />
          <Text variant="h3">Trip Status</Text>
        </View>
        <Pressable
          onPress={handleClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && { opacity: 0.5 },
          ]}
          hitSlop={10}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {statusInfo ? (
          <Card style={styles.statusCard}>
            <View style={styles.cardHeader}>
              <IconBox
                name={
                  isCompleted
                    ? "checkmark-circle-outline"
                    : isOnTrip
                      ? "map-outline"
                      : "time-outline"
                }
                variant={isCompleted ? "success" : "info"}
                size={20}
              />
              <Text
                variant="label"
                color={isCompleted ? colors.success : colors.textSecondary}
              >
                {statusInfo.title}
              </Text>
            </View>

            <Text variant="h1" style={styles.statusMessage}>
              {statusInfo.message}
            </Text>
            {isAccepted && !isOnTrip && (
              <>
                {statusInfo.pickupLocation && (
                  <Text
                    variant="bodySemibold"
                    color={colors.text}
                    style={styles.pickupLocation}
                  >
                    Your Pickup Point: {statusInfo.pickupLocation}
                  </Text>
                )}
                <Text
                  variant="body"
                  color={colors.textSecondary}
                  style={styles.location}
                >
                  Driver Start Location: {statusInfo.location}
                </Text>
              </>
            )}

            {isOnTrip && (
              <Text
                variant="body"
                color={colors.textSecondary}
                style={styles.location}
              >
                Your Destination: {statusInfo.location}
              </Text>
            )}

            {liveDriverInfo && (isAccepted || isOnTrip) && (
              <View
                style={[
                  styles.liveDriverCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.liveDriverHeader}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text variant="captionSemibold" color={colors.textSecondary}>
                    DRIVER LIVE LOCATION
                  </Text>
                </View>

                {!liveDriverInfo.hasDriverLocation ? (
                  <Text variant="body" color={colors.textSecondary}>
                    Waiting for driver location...
                  </Text>
                ) : (
                  <>
                    <Text variant="bodySemibold">
                      {liveDriverInfo.target === "dropoff"
                        ? liveDriverInfo.hasArrivedAtTarget
                          ? "You have arrived at your destination."
                          : liveDriverInfo.targetDistanceLabel
                            ? `Destination is ${liveDriverInfo.targetDistanceLabel} away.`
                            : "Heading to your destination."
                        : liveDriverInfo.hasArrivedAtPickup
                          ? "Driver has arrived at your pickup point."
                          : liveDriverInfo.pickupDistanceLabel
                            ? `Driver is ${liveDriverInfo.pickupDistanceLabel} from pickup.`
                            : "Driver is en route to pickup."}
                    </Text>

                    {!liveDriverInfo.hasArrivedAtTarget &&
                      (liveDriverInfo.targetEtaLabel !== null ||
                        liveDriverInfo.targetDistanceKm !== null ||
                        liveDriverInfo.pickupEtaLabel !== null ||
                        liveDriverInfo.pickupDistanceKm !== null) && (
                        <Text variant="caption" color={colors.textSecondary}>
                          ETA:{" "}
                          {liveDriverInfo.targetEtaLabel ??
                            liveDriverInfo.pickupEtaLabel ??
                            (liveDriverInfo.targetDistanceKm !== null
                              ? liveDriverInfo.targetDistanceKm < 0.2
                                ? "less than 1 min"
                                : liveDriverInfo.targetDistanceKm < 0.8
                                  ? "1-2 min"
                                  : liveDriverInfo.targetDistanceKm < 2
                                    ? "3-5 min"
                                    : liveDriverInfo.targetDistanceKm < 5
                                      ? "6-10 min"
                                      : "10+ min"
                              : liveDriverInfo.pickupDistanceKm !== null
                                ? liveDriverInfo.pickupDistanceKm < 0.2
                                  ? "less than 1 min"
                                  : liveDriverInfo.pickupDistanceKm < 0.8
                                    ? "1-2 min"
                                    : liveDriverInfo.pickupDistanceKm < 2
                                      ? "3-5 min"
                                      : liveDriverInfo.pickupDistanceKm < 5
                                        ? "6-10 min"
                                        : "10+ min"
                                : "Calculating...")}
                        </Text>
                      )}

                    <Text variant="caption" color={colors.textTertiary}>
                      {liveDriverInfo.locationFreshnessLabel}
                    </Text>

                    {liveDriverInfo.autoPickedUp && (
                      <Text variant="caption" color={colors.success}>
                        Pickup was auto-confirmed based on arrival proximity.
                      </Text>
                    )}

                    {liveDriverInfo.isFetchingDriverLocation && (
                      <Text variant="caption" color={colors.textTertiary}>
                        Updating...
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}

            {isAccepted && pickupConfirmed && (
              <View
                style={[
                  styles.confirmedBanner,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.text}
                />
                <Text variant="bodySemibold">Pickup Confirmed</Text>
              </View>
            )}

            {!isCompleted && (
              <View style={styles.cardActions}>
                <Button
                  title="OPEN IN MAPS"
                  variant="secondary"
                  icon="navigate-outline"
                  onPress={actions.handleOpenMaps}
                  disabled={!actions.canOpenMaps}
                  size="lg"
                  style={styles.fullWidth}
                />
                {!actions.canOpenMaps && actions.mapsDisabledReason && (
                  <Button
                    title={actions.mapsDisabledReason.toUpperCase()}
                    variant="ghost"
                    size="sm"
                    disabled
                    style={styles.mapsHelperBtn}
                    textStyle={{ color: colors.textSecondary, fontSize: 12 }}
                  />
                )}

                {isAccepted && !pickupConfirmed && (
                  <Button
                    title="MANUAL PICKUP FALLBACK"
                    onPress={actions.handleConfirmPickup}
                    isLoading={isConfirming}
                    size="sm"
                    variant="ghost"
                    style={styles.manualPickupBtn}
                  />
                )}
              </View>
            )}
          </Card>
        ) : (
          <View style={styles.centerContent}>
            <IconBox
              name="car-outline"
              variant="subtle"
              size={32}
              style={styles.iconBox}
            />
            <Text variant="h2" style={styles.emptyTitle}>
              NO ACTIVE STATUS
            </Text>
            <Text
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.emptySubtext}
            >
              Information for this ride is currently unavailable.
            </Text>
          </View>
        )}

        {!isCompleted && (
          <View style={styles.safetySection}>
            <FormSection title="SAFETY TOOLS">
              <View style={styles.safetyRow}>
                <Button
                  title="EMERGENCY"
                  variant="secondary"
                  icon="shield-outline"
                  onPress={() => {
                    router.push(
                      `/(app)/(modals)/safety?mode=emergency&tripId=${tripId}` as Href
                    );
                  }}
                  style={styles.safetyBtn}
                />
                <Button
                  title="REPORT"
                  variant="secondary"
                  icon="alert-circle-outline"
                  onPress={() => {
                    router.push(
                      `/(app)/(modals)/safety?mode=report&tripId=${tripId}` as Href
                    );
                  }}
                  style={styles.safetyBtn}
                />
              </View>
            </FormSection>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  closeButton: { padding: 4 },
  content: { flex: 1, padding: 16 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconBox: { width: 64, height: 64, borderRadius: 16, marginBottom: 16 },
  emptyTitle: { marginBottom: 8, textAlign: "center" },
  emptySubtext: { lineHeight: 22, paddingHorizontal: 20 },
  actionBtn: { marginTop: 24, minWidth: 160 },
  statusCard: { padding: 24, marginBottom: 24 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  statusMessage: { fontSize: 28, marginBottom: 8, lineHeight: 32 },
  pickupLocation: { marginBottom: 4, fontSize: 16 },
  location: { marginBottom: 32, fontSize: 16 },
  mainAction: { marginBottom: 12 },
  cardActions: { gap: 12 },
  fullWidth: { width: "100%" },
  mapsHelperBtn: { marginTop: -2, opacity: 0.9 },
  manualPickupBtn: { marginTop: 4, alignSelf: "center" },
  confirmedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  liveDriverCard: {
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  liveDriverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  safetySection: { marginTop: 8 },
  safetyRow: { flexDirection: "row", gap: 12 },
  safetyBtn: { flex: 1 },
});
