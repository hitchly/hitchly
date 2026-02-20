import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconBox } from "@/components/ui/IconBox";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { TripCompletionSummary } from "@/features/trips/components/TripCompletionSummary";
import { useDriveTrip } from "@/features/trips/hooks/useDriveTrip";

export function DriverDriveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  } = useDriveTrip(id);

  if (isLoading) return <Skeleton text="Loading Trip..." />;

  if (tripHasError) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.header}>
          <Button
            size="icon"
            variant="ghost"
            icon="arrow-back"
            onPress={() => {
              router.back();
            }}
          />
          <Text variant="h2" style={styles.title}>
            TRIP IN PROGRESS
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <IconBox
            name="warning-outline"
            variant="error"
            size={32}
            style={styles.iconBox}
          />
          <Text variant="h2" style={styles.emptyTitle}>
            TRIP NOT FOUND
          </Text>
          <Button
            title="GO BACK"
            variant="secondary"
            onPress={() => {
              router.back();
            }}
            style={styles.actionBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <TripCompletionSummary
        visible={summaryVisible}
        summary={summaryData}
        onClose={() => {
          setSummaryVisible(false);
          if (id) router.push(`/(app)/driver/trips/${id}`);
        }}
      />

      <View style={styles.header}>
        <Button
          size="icon"
          variant="ghost"
          icon="arrow-back"
          onPress={() => {
            router.back();
          }}
        />
        <Text variant="h2" style={styles.title}>
          TRIP IN PROGRESS
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {currentStop ? (
          <Card style={styles.stopCard}>
            <View style={styles.cardHeader}>
              <IconBox
                name={
                  currentStop.type === "pickup"
                    ? "log-in-outline"
                    : "log-out-outline"
                }
                variant="subtle"
                size={20}
              />
              <Text variant="label" color={colors.textSecondary}>
                {currentStop.type === "pickup"
                  ? "PICKUP PASSENGER"
                  : "DROP OFF PASSENGER"}
              </Text>
            </View>

            <Text variant="h1" style={styles.passengerName}>
              {currentStop.passengerName}
            </Text>
            <Text
              variant="body"
              color={colors.textSecondary}
              style={styles.location}
            >
              {currentStop.location}
            </Text>

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
                <Text
                  variant="captionSemibold"
                  align="center"
                  color={colors.textSecondary}
                >
                  WAITING FOR PASSENGER TO CONFIRM PICKUP...
                </Text>
              </View>
            )}

            <View style={styles.actionContainer}>
              <Button
                title={
                  currentStop.type === "pickup"
                    ? "CONFIRM PICKUP"
                    : "CONFIRM DROP OFF"
                }
                onPress={actions.handleAction}
                disabled={isWaitingForRider}
                isLoading={isUpdatingStatus}
                size="lg"
              />
              <Button
                title="OPEN IN MAPS"
                variant="secondary"
                icon="map-outline"
                onPress={actions.handleOpenMaps}
                size="lg"
              />
            </View>
          </Card>
        ) : !hasRequests ? (
          <View style={styles.centerContent}>
            <IconBox
              name="people-outline"
              variant="subtle"
              size={32}
              style={styles.iconBox}
            />
            <Text variant="h2" style={styles.emptyTitle}>
              NO PASSENGERS YET
            </Text>
            <Text
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.emptySubtext}
            >
              Passengers can join your trip from the trip details screen.
            </Text>
          </View>
        ) : hasPendingRequests ? (
          <View style={styles.centerContent}>
            <IconBox
              name="hourglass-outline"
              variant="subtle"
              size={32}
              style={styles.iconBox}
            />
            <Text variant="h2" style={styles.emptyTitle}>
              WAITING FOR REQUESTS
            </Text>
            <Text
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.emptySubtext}
            >
              Accept passenger requests to start pickups.
            </Text>
          </View>
        ) : allCompleted ? (
          <View style={styles.centerContent}>
            <IconBox
              name="checkmark-circle-outline"
              variant="subtle"
              size={32}
              style={styles.iconBox}
            />
            <Text variant="h2" style={styles.emptyTitle}>
              ALL STOPS COMPLETED
            </Text>
            <Text
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.emptySubtext}
            >
              All passengers have been picked up and dropped off.
            </Text>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <IconBox
              name="car-outline"
              variant="subtle"
              size={32}
              style={styles.iconBox}
            />
            <Text variant="h2" style={styles.emptyTitle}>
              NO ACTIVE STOPS
            </Text>
            <Text
              variant="body"
              color={colors.textSecondary}
              align="center"
              style={styles.emptySubtext}
            >
              Check back later for passenger pickups.
            </Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { letterSpacing: 0.5 },
  placeholder: { width: 44, height: 44 },

  content: { flex: 1, padding: 16, justifyContent: "center" },
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

  stopCard: { padding: 24 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  passengerName: { fontSize: 32, marginBottom: 4 },
  location: { marginBottom: 32, fontSize: 16 },

  waitingBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  actionContainer: { gap: 12 },
});
