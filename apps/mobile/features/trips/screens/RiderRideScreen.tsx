import { Ionicons } from "@expo/vector-icons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Alert, StyleSheet, View } from "react-native";
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const {
    isLoading,
    tripMissing,
    isTestUser,
    isAccepted,
    isOnTrip,
    isCompleted,
    pickupConfirmed,
    statusInfo,
    isConfirming,
    actions,
  } = useRideTrip(id);

  // Auto-redirect to review if trip completes while viewing
  useEffect(() => {
    if (isCompleted && id) {
      // Delay slightly so user sees the "Completed" state before nav
      const timeout = setTimeout(() => {
        router.push(`/(app)/rider/trips/${id}/review` as Href);
      }, 1500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [id, isCompleted, router]);

  if (isLoading) return <Skeleton text="Loading Trip Details..." />;

  if (tripMissing) {
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
            TRIP STATUS
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
          TRIP STATUS
        </Text>
        <View style={styles.placeholder} />
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
            <Text
              variant="body"
              color={colors.textSecondary}
              style={styles.location}
            >
              {statusInfo.location}
            </Text>

            {isAccepted && !pickupConfirmed && (
              <Button
                title="CONFIRM PICKUP"
                onPress={actions.handleConfirmPickup}
                isLoading={isConfirming}
                size="lg"
                style={styles.mainAction}
              />
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
              <Button
                title="OPEN IN MAPS"
                variant="secondary"
                icon="navigate-outline"
                onPress={actions.handleOpenMaps}
                size="lg"
              />
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

        {/* Safety Tools Section */}
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
                      `/(app)/safety?mode=emergency&tripId=${id}` as Href
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
                      `/(app)/safety?mode=report&tripId=${id}` as Href
                    );
                  }}
                  style={styles.safetyBtn}
                />
              </View>
            </FormSection>
          </View>
        )}

        {/* Developer Sandbox Section */}
        {!isCompleted && isTestUser && (
          <View style={styles.devSection}>
            <FormSection title="DEVELOPER SANDBOX">
              <Card style={styles.devCard}>
                {isAccepted && pickupConfirmed && (
                  <Button
                    title="Mock Driver Pickup"
                    variant="danger"
                    icon="car-outline"
                    onPress={() => {
                      Alert.alert(
                        "Simulate",
                        "This action is pending backend test implementation."
                      );
                    }}
                  />
                )}
                {isOnTrip && (
                  <Button
                    title="Mock Driver Drop Off"
                    variant="danger"
                    icon="exit-outline"
                    onPress={() => {
                      Alert.alert(
                        "Simulate",
                        "This action is pending backend test implementation."
                      );
                    }}
                  />
                )}
              </Card>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { letterSpacing: 0.5 },
  placeholder: { width: 44, height: 44 },

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
  location: { marginBottom: 32, fontSize: 16 },
  mainAction: { marginBottom: 12 },

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

  safetySection: { marginTop: 8 },
  safetyRow: { flexDirection: "row", gap: 12 },
  safetyBtn: { flex: 1 },

  devSection: { marginTop: 16 },
  devCard: { padding: 16, gap: 12 },
});
