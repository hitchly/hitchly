import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { TripCompletionSummary } from "@/features/trips/components/TripCompletionSummary";
import { useDriveTrip } from "@/features/trips/hooks/useDriveTrip";

export default function DriverDriveScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const {
    isLoading,
    tripHasError,
    currentStop,
    hasRequests,
    allCompleted,
    hasPendingRequests,
    isWaitingForRider,
    isUpdatingStatus,
    summaryVisible,
    setSummaryVisible,
    summaryData,
    actions,
  } = useDriveTrip(tripId);

  const handleClose = () => {
    router.back();
  };

  if (isLoading) {
    return <Skeleton text="Loading Trip..." />;
  }

  if (tripHasError) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text variant="h3">Trip Error</Text>
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={10}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="warning" size={48} color={colors.textTertiary} />
          <Text variant="h3" style={styles.mt16}>
            TRIP NOT FOUND
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            align="center"
            style={styles.mb24}
          >
            We couldn&apos;t locate this active drive.
          </Text>
          <Button title="CLOSE" variant="secondary" onPress={handleClose} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <TripCompletionSummary
        visible={summaryVisible}
        summary={summaryData}
        onClose={() => {
          setSummaryVisible(false);
          handleClose();
        }}
      />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.pulseDot, { backgroundColor: colors.text }]} />
          <Text variant="h3">Trip Status</Text>
        </View>
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={10}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {currentStop ? (
          <View style={styles.statusContainer}>
            <Text variant="h1" style={styles.statusTitle}>
              {currentStop.type === "pickup" ? "Pickup" : "Drop-off"}
            </Text>

            <Card style={styles.infoCard}>
              <View style={styles.locationRow}>
                <Ionicons
                  name="person-circle"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text variant="h3">{currentStop.passengerName}</Text>
              </View>

              <View style={styles.locationRow}>
                <Ionicons
                  name="location"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.ml4}
                />
                <Text variant="body" color={colors.textSecondary}>
                  {currentStop.location}
                </Text>
              </View>

              <View style={styles.actionsContainer}>
                {isWaitingForRider && (
                  <View
                    style={[
                      styles.waitingBanner,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="time"
                      size={18}
                      color={colors.textSecondary}
                    />
                    <Text
                      variant="captionSemibold"
                      color={colors.textSecondary}
                    >
                      WAITING FOR CONFIRMATION
                    </Text>
                  </View>
                )}

                <Button
                  title={
                    currentStop.type === "pickup"
                      ? "CONFIRM PICKUP"
                      : "CONFIRM DROP OFF"
                  }
                  onPress={() => {
                    actions.handleAction();
                  }}
                  disabled={isWaitingForRider}
                  isLoading={isUpdatingStatus}
                  size="lg"
                />
              </View>
            </Card>

            <View style={styles.toolbar}>
              <View style={styles.toolbarItem}>
                <Button
                  variant="secondary"
                  size="icon"
                  icon="navigate"
                  onPress={() => {
                    actions.handleOpenMaps();
                  }}
                />
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={styles.toolbarLabel}
                >
                  MAPS
                </Text>
              </View>

              <View style={styles.toolbarItem}>
                <Button
                  variant="secondary"
                  size="icon"
                  icon="shield-checkmark"
                  onPress={() => {
                    router.push(
                      `/(app)/(modals)/safety?mode=emergency&tripId=${tripId}` as Href
                    );
                  }}
                />
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={styles.toolbarLabel}
                >
                  SAFETY
                </Text>
              </View>

              <View style={styles.toolbarItem}>
                <Button
                  variant="secondary"
                  size="icon"
                  icon="flag"
                  onPress={() => {
                    router.push(
                      `/(app)/(modals)/safety?mode=report&tripId=${tripId}` as Href
                    );
                  }}
                />
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={styles.toolbarLabel}
                >
                  REPORT
                </Text>
              </View>
            </View>
          </View>
        ) : !hasRequests ? (
          <EmptyState
            icon="people"
            title="NO PASSENGERS YET"
            subtitle="Passengers can join your trip from the details screen."
          />
        ) : hasPendingRequests ? (
          <EmptyState
            icon="hourglass"
            title="WAITING FOR REQUESTS"
            subtitle="Accept passenger requests to start pickups."
          />
        ) : allCompleted ? (
          <EmptyState
            icon="checkmark-circle"
            title="ALL STOPS COMPLETED"
            subtitle="All passengers have been handled."
          />
        ) : (
          <EmptyState
            icon="car"
            title="NO ACTIVE STOPS"
            subtitle="Check back later for passenger pickups."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.centerContent}>
      <Ionicons name={icon} size={48} color={colors.textTertiary} />
      <Text variant="h3" style={styles.mt16} align="center">
        {title}
      </Text>
      <Text
        variant="body"
        color={colors.textSecondary}
        align="center"
        style={styles.mt8}
      >
        {subtitle}
      </Text>
    </View>
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
  content: { padding: 20 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  statusContainer: { gap: 24, paddingTop: 12 },
  statusTitle: { fontSize: 36, lineHeight: 40, letterSpacing: -0.5 },
  infoCard: { padding: 24, gap: 16 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionsContainer: { marginTop: 8 },
  waitingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-start",
    marginTop: 16,
  },
  toolbarItem: { alignItems: "center", gap: 8 },
  toolbarLabel: { fontSize: 10, letterSpacing: 0.5 },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  mb24: { marginBottom: 24 },
  ml4: { marginLeft: 4 },
});
