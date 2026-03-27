import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { Alert } from "react-native";
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
import type { RouterOutputs } from "@/lib/trpc";
import { trpc } from "@/lib/trpc";

type Trip = RouterOutputs["trip"]["getTrips"][number];

export function RiderTripsScreen() {
  const { colors } = useTheme();
  const { trips, isLoading, isRefetching, refetch, router, currentUserId } =
    useRiderTrips();
  const utils = trpc.useUtils();
  const createRequestMutation = trpc.trip.createTripRequest.useMutation({
    onSuccess: async () => {
      await utils.trip.getTrips.invalidate();
      void utils.trip.getTripRequests.invalidate();
    },
    onError: (err) => {
      Alert.alert("Request failed", err.message);
    },
  });

  const handleRequestNext = async (input: {
    trip: Trip;
    pickupLat: number;
    pickupLng: number;
  }) => {
    if (!input.trip.recurringScheduleId || !input.trip.departureTime) return;

    const tripDepartureDate = new Date(input.trip.departureTime);
    if (Number.isNaN(tripDepartureDate.getTime())) {
      Alert.alert(
        "Unavailable",
        "Could not determine this trip's day of week."
      );
      return;
    }

    const next = await utils.recurringSchedule.getNextTripOccurrence.fetch({
      recurringScheduleId: input.trip.recurringScheduleId,
      after: tripDepartureDate,
      targetWeekday: tripDepartureDate.getDay(),
    });

    if (!next) {
      Alert.alert(
        "Not posted yet",
        "Next week's ride isn't posted yet. Please check back later."
      );
      return;
    }

    await createRequestMutation.mutateAsync({
      tripId: next.id,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
    });
  };

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
                router.push("/(app)/rider" as Href);
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
              onRequestNext={handleRequestNext}
              isRequestingNext={createRequestMutation.isPending}
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
