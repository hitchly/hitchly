import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SwipeDeck,
  RiderCard,
  type TripRequestWithDetails,
} from "../../../components/swipe";
import { useTheme } from "../../../context/theme-context";
import { authClient } from "../../../lib/auth-client";
import { trpc } from "../../../lib/trpc";

export default function DriverSwipeRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const utils = trpc.useUtils();

  // Get all trips for the driver
  const { data: driverTrips, isLoading: isLoadingTrips } =
    trpc.trip.getTrips.useQuery(undefined, {
      enabled: !!userId,
    });

  // Get requests for all active trips
  const tripIds = useMemo(
    () =>
      driverTrips
        ?.filter(
          (trip) => trip.status === "pending" || trip.status === "active"
        )
        .map((trip) => trip.id) || [],
    [driverTrips]
  );

  // Fetch requests for each trip
  const requestQueries = tripIds.map((tripId) =>
    trpc.trip.getTripRequests.useQuery(
      { tripId },
      { enabled: !!userId && tripIds.length > 0 }
    )
  );

  // Aggregate all pending requests
  const allPendingRequests = useMemo(() => {
    const requests: TripRequestWithDetails[] = [];
    requestQueries.forEach((query) => {
      if (query.data) {
        query.data
          .filter((req) => req.status === "pending")
          .forEach((req) => requests.push(req as TripRequestWithDetails));
      }
    });
    return requests;
  }, [requestQueries]);

  const isLoading = isLoadingTrips || requestQueries.some((q) => q.isLoading);

  const acceptRequest = trpc.trip.acceptTripRequest.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate();
      utils.trip.getTripById.invalidate();
      Alert.alert("Success", "Request accepted successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const rejectRequest = trpc.trip.rejectTripRequest.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate();
      Alert.alert("Success", "Request rejected");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleSwipeRight = (request: TripRequestWithDetails) => {
    acceptRequest.mutate({ requestId: request.id });
  };

  const handleSwipeLeft = (request: TripRequestWithDetails) => {
    rejectRequest.mutate({ requestId: request.id });
  };

  const handleCardTap = (request: TripRequestWithDetails) => {
    // Show request details modal or navigate to details
    Alert.alert(
      "Request Details",
      `Rider: ${request.rider?.name || request.rider?.email || "Unknown"}\nTrip: ${request.trip.origin} → ${request.trip.destination}`,
      [{ text: "OK" }]
    );
  };

  const handleDeckEmpty = () => {
    Alert.alert(
      "All Caught Up",
      "You've reviewed all pending requests. Check back later for new requests."
    );
  };

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

  if (!driverTrips || driverTrips.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Trip Requests
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No trips found
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Create a trip first to receive ride requests
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (allPendingRequests.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Trip Requests
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="checkmark-circle-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No pending requests
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            You&apos;ll see ride requests here when riders request to join your
            trips
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Review Requests
        </Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.swipeContainer}>
        <SwipeDeck
          data={allPendingRequests}
          renderCard={(request) => <RiderCard request={request} />}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onCardTap={handleCardTap}
          onDeckEmpty={handleDeckEmpty}
        />
      </View>

      {/* Swipe instructions */}
      <View style={styles.instructionsContainer}>
        <View style={styles.instructionRow}>
          <Ionicons name="close-circle" size={24} color={colors.error} />
          <Text
            style={[styles.instructionText, { color: colors.textSecondary }]}
          >
            Swipe left to reject
          </Text>
        </View>
        <View style={styles.instructionRow}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text
            style={[styles.instructionText, { color: colors.textSecondary }]}
          >
            Swipe right to accept
          </Text>
        </View>
      </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
