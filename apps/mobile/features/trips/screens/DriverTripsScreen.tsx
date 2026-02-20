import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { DriverTripCard } from "@/features/trips/components/DriverTripCard";
import { useDriverTrips } from "@/features/trips/hooks/useDriverTrips";

export function DriverTripsScreen() {
  const { colors } = useTheme();
  const { trips, isLoading, isRefetching, refetch, router } = useDriverTrips();

  if (isLoading) return <Skeleton text="Loading your trips..." />;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={void refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.dashboardHeader}>
          <Text variant="h1">My Trips</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                router.push("/(app)/driver/trips/create" as Href);
              }}
              style={({ pressed }) => [
                styles.vercelButtonBase,
                styles.vercelButtonPrimary,
                { backgroundColor: colors.text, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="add" size={18} color={colors.background} />
              <Text
                variant="bodySemibold"
                style={{ color: colors.background, marginLeft: 4 }}
              >
                Post Ride
              </Text>
            </Pressable>
          </View>
        </View>

        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="h3" color={colors.textSecondary}>
              No trips found
            </Text>
            <Text variant="body" color={colors.textTertiary}>
              Post a ride to McMaster to get started.
            </Text>
          </View>
        ) : (
          trips.map((trip) => (
            <DriverTripCard
              key={trip.id}
              trip={trip}
              onPress={() => {
                router.push(`/(app)/driver/trips/${trip.id}` as Href);
              }}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 40 },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  vercelButtonBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  vercelButtonPrimary: {
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyState: { alignItems: "center", marginTop: 60, gap: 8 },
});
