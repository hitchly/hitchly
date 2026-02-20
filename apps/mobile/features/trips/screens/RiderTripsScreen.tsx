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
import { RiderTripCard } from "@/features/trips/components/RiderTripCard";
import { useRiderTrips } from "@/features/trips/hooks/useRiderTrips";

export function RiderTripsScreen() {
  const { colors } = useTheme();
  const { trips, isLoading, isRefetching, refetch, router, currentUserId } =
    useRiderTrips();

  if (isLoading) return <Skeleton text="Loading your rides..." />;

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
          <Text variant="h1">My Rides</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                router.push("/(app)/rider");
              }}
              style={({ pressed }) => [
                styles.vercelButtonBase,
                styles.vercelButtonPrimary,
                { backgroundColor: colors.text, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.background} />
              <Text
                variant="bodySemibold"
                style={{ color: colors.background, marginLeft: 6 }}
              >
                Find a Ride
              </Text>
            </Pressable>
          </View>
        </View>

        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="h3" color={colors.textSecondary}>
              No rides booked
            </Text>
            <Text variant="body" color={colors.textTertiary}>
              Search for a ride to McMaster to get started.
            </Text>
          </View>
        ) : (
          trips.map((trip) => (
            <RiderTripCard
              key={trip.id}
              trip={trip}
              currentUserId={currentUserId}
              onPress={() => {
                router.push(`/(app)/rider/trips/${trip.id}` as Href);
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
