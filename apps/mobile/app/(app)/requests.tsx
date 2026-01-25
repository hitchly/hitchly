import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";
import {
  SwipeDeck,
  RiderCard,
  type TripRequestWithDetails,
} from "../../components/swipe";

export default function RequestsScreen() {
  const { colors } = useTheme();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const utils = trpc.useUtils();

  // Get user profile to determine role
  const { data: userProfile, isLoading: isLoadingProfile } =
    trpc.profile.getMe.useQuery(undefined, { enabled: !!userId });

  const appRole = userProfile?.profile?.appRole || "rider";
  const isDriver = appRole === "driver";

  // Get all trips for the user (only if driver)
  const { data: driverTrips, isLoading: isLoadingTrips } =
    trpc.trip.getTrips.useQuery(undefined, { enabled: !!userId && isDriver });

  // Filter out cancelled trips
  const activeDriverTrips =
    driverTrips?.filter((trip) => trip.status !== "cancelled") || [];

  // Get requests - if driver, we'll need to fetch for each trip
  // For now, get first trip's requests as a placeholder - we'll need to aggregate
  const firstTripId = activeDriverTrips?.[0]?.id;

  const {
    data: firstTripRequests,
    isLoading: isLoadingFirstTrip,
    refetch: refetchFirstTrip,
  } = trpc.trip.getTripRequests.useQuery(
    { tripId: firstTripId || "" },
    { enabled: !!userId && !!firstTripId && isDriver }
  );

  // Get rider requests (requests made by user)
  const {
    data: riderRequests,
    isLoading: isLoadingRiderRequests,
    refetch: refetchRiderRequests,
    isRefetching: isRefetchingRiderRequests,
  } = trpc.trip.getTripRequests.useQuery(
    { riderId: userId },
    { enabled: !!userId && !isDriver }
  );

  const isLoading =
    isLoadingProfile ||
    isLoadingTrips ||
    (isDriver && isLoadingFirstTrip) ||
    (!isDriver && isLoadingRiderRequests);

  // For drivers: fetch requests for all trips (simplified - showing first trip's requests)
  // TODO: Implement proper aggregation for all trips
  const allDriverRequests = useMemo(() => {
    if (!isDriver) return [];
    // For now, return first trip's requests - in production, aggregate all trips
    return firstTripRequests || [];
  }, [firstTripRequests, isDriver]);

  // Determine if user is viewing as driver or rider
  const isDriverView = isDriver;
  const requests = isDriverView ? allDriverRequests : riderRequests || [];

  // Filter out requests for cancelled trips
  const filteredRequests = requests.filter((req) => {
    if (!req.trip) return false;
    return req.trip.status !== "cancelled";
  });

  // Filter pending requests for swipe view
  const pendingRequests = useMemo(() => {
    if (!isDriverView) return [];
    return filteredRequests.filter(
      (req) => req.status === "pending"
    ) as TripRequestWithDetails[];
  }, [filteredRequests, isDriverView]);

  const acceptRequest = trpc.trip.acceptTripRequest.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate();
      utils.trip.getTripById.invalidate();
      if (isDriver) {
        refetchFirstTrip();
      } else {
        refetchRiderRequests();
      }
      // Alert removed per user request - success handled silently
    },
    onError: (error) => {
      setTimeout(() => {
        Alert.alert("Error", error.message);
      }, 500);
    },
  });

  const rejectRequest = trpc.trip.rejectTripRequest.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate();
      if (isDriver) {
        refetchFirstTrip();
      }
      // Alert removed per user request - success handled silently
    },
    onError: (error) => {
      setTimeout(() => {
        Alert.alert("Error", error.message);
      }, 500);
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading requests...
          </Text>
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
        <Text style={[styles.title, { color: colors.text }]}>
          {isDriverView ? "Trip Requests" : "My Requests"}
        </Text>
      </View>

      {filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No requests yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {isDriverView
              ? "You'll see ride requests here when riders request to join your trips"
              : "You haven't requested any rides yet"}
          </Text>
        </View>
      ) : isDriverView && pendingRequests.length > 0 ? (
        <>
          <View style={styles.swipeContainer}>
            <SwipeDeck
              data={pendingRequests}
              renderCard={(request) => <RiderCard request={request} />}
              onSwipeLeft={(request) => {
                // Use InteractionManager to defer the mutation until all interactions/animations complete
                InteractionManager.runAfterInteractions(() => {
                  try {
                    rejectRequest.mutate({ requestId: request.id });
                  } catch (error) {
                    console.error("Error in onSwipeLeft:", error);
                    setTimeout(() => {
                      Alert.alert("Error", "Failed to reject request");
                    }, 500);
                  }
                });
              }}
              onSwipeRight={(request) => {
                // Use InteractionManager to defer the mutation until all interactions/animations complete
                InteractionManager.runAfterInteractions(() => {
                  try {
                    acceptRequest.mutate({ requestId: request.id });
                  } catch (error) {
                    console.error("Error in onSwipeRight:", error);
                    setTimeout(() => {
                      Alert.alert("Error", "Failed to accept request");
                    }, 500);
                  }
                });
              }}
              onCardTap={(request) => {
                setTimeout(() => {
                  Alert.alert(
                    "Request Details",
                    `Rider: ${request.rider?.name || request.rider?.email || "Unknown"}\nTrip: ${request.trip.origin} → ${request.trip.destination}`
                  );
                }, 500);
              }}
              onDeckEmpty={() => {
                // Alert removed per user request - deck empty handled silently
              }}
            />
          </View>
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionRow}>
              <Ionicons name="close-circle" size={24} color={colors.error} />
              <Text
                style={[
                  styles.instructionText,
                  { color: colors.textSecondary },
                ]}
              >
                Swipe left to reject
              </Text>
            </View>
            <View style={styles.instructionRow}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.success}
              />
              <Text
                style={[
                  styles.instructionText,
                  { color: colors.textSecondary },
                ]}
              >
                Swipe right to accept
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {isDriverView ? "No pending requests" : "No requests yet"}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {isDriverView
              ? "All requests have been reviewed"
              : "You haven't requested any rides yet"}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  swipeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  instructionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
