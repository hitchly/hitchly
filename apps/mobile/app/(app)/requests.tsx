import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";
import { useRouter } from "expo-router";
import {
  SwipeDeck,
  RiderCard,
  type TripRequestWithDetails,
} from "../../components/swipe";

export default function RequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const utils = trpc.useUtils();
  const [viewMode, setViewMode] = useState<"list" | "swipe">("list");

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
  const isRefetching = isRefetchingRiderRequests;

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
      Alert.alert("Success", "Request accepted successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const rejectRequest = trpc.trip.rejectTripRequest.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate();
      if (isDriver) {
        refetchFirstTrip();
      }
      Alert.alert("Success", "Request rejected");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const cancelRequest = trpc.trip.cancelTripRequest.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate();
      refetchRiderRequests();
      utils.trip.getTripById.invalidate();
      Alert.alert("Success", "Request cancelled");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleRefetch = () => {
    if (isDriver) {
      refetchFirstTrip();
    } else {
      refetchRiderRequests();
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return colors.success;
      case "rejected":
        return colors.error;
      case "cancelled":
        return colors.textSecondary;
      default:
        return colors.primary;
    }
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isDriverView ? "Trip Requests" : "My Requests"}
        </Text>
        {isDriverView && pendingRequests.length > 0 && (
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === "list" ? "swipe" : "list")}
            style={[
              styles.toggleButton,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons
              name={viewMode === "list" ? "swap-horizontal" : "list"}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.toggleText, { color: colors.primary }]}>
              {viewMode === "list" ? "Swipe Mode" : "List Mode"}
            </Text>
          </TouchableOpacity>
        )}
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
      ) : isDriverView && viewMode === "swipe" && pendingRequests.length > 0 ? (
        <>
          <View style={styles.swipeContainer}>
            <SwipeDeck
              data={pendingRequests}
              renderCard={(request) => <RiderCard request={request} />}
              onSwipeLeft={(request) => {
                rejectRequest.mutate({ requestId: request.id });
              }}
              onSwipeRight={(request) => {
                acceptRequest.mutate({ requestId: request.id });
              }}
              onCardTap={(request) => {
                Alert.alert(
                  "Request Details",
                  `Rider: ${request.rider?.name || request.rider?.email || "Unknown"}\nTrip: ${request.trip.origin} → ${request.trip.destination}`
                );
              }}
              onDeckEmpty={() => {
                setViewMode("list");
                Alert.alert(
                  "All Caught Up",
                  "You've reviewed all pending requests."
                );
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
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefetch}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const request = item;
            const trip = item.trip;
            const rider = item.rider;

            return (
              <Card style={styles.requestCard}>
                {/* Trip Info */}
                {trip && (
                  <TouchableOpacity
                    onPress={() => router.push(`/trips/${trip.id}`)}
                    style={styles.tripInfo}
                  >
                    <View style={styles.routeRow}>
                      <Text style={[styles.routeText, { color: colors.text }]}>
                        {trip.origin}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.routeText, { color: colors.text }]}>
                        {trip.destination}
                      </Text>
                    </View>
                    <View style={styles.tripMeta}>
                      <Text
                        style={[
                          styles.metaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatDate(trip.departureTime)}
                      </Text>
                      <Text
                        style={[
                          styles.metaText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        • {trip.maxSeats - trip.bookedSeats} seat
                        {trip.maxSeats - trip.bookedSeats !== 1 ? "s" : ""}{" "}
                        available
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Rider/Driver Info */}
                {isDriverView && rider && (
                  <View style={styles.userInfo}>
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.userText, { color: colors.text }]}>
                      {rider.name || rider.email || "Unknown"}
                    </Text>
                  </View>
                )}

                {/* Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(request.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(request.status) },
                    ]}
                  >
                    {request.status}
                  </Text>
                </View>

                {/* Request Time */}
                <Text
                  style={[styles.timeText, { color: colors.textSecondary }]}
                >
                  Requested {formatDate(request.createdAt)}
                </Text>

                {/* Action Buttons */}
                {isDriverView
                  ? request.status === "pending" && (
                      <View style={styles.actionRow}>
                        <Button
                          title="Accept"
                          onPress={() => {
                            Alert.alert(
                              "Accept Request",
                              `Accept ${rider?.name || rider?.email || "this rider"}'s request?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Accept",
                                  onPress: () =>
                                    acceptRequest.mutate({
                                      requestId: request.id,
                                    }),
                                },
                              ]
                            );
                          }}
                          variant="primary"
                          isLoading={acceptRequest.isPending}
                          style={styles.actionButton}
                        />
                        <Button
                          title="Reject"
                          onPress={() => {
                            Alert.alert(
                              "Reject Request",
                              `Reject ${rider?.name || rider?.email || "this rider"}'s request?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Reject",
                                  style: "destructive",
                                  onPress: () =>
                                    rejectRequest.mutate({
                                      requestId: request.id,
                                    }),
                                },
                              ]
                            );
                          }}
                          variant="secondary"
                          isLoading={rejectRequest.isPending}
                          style={styles.actionButton}
                        />
                      </View>
                    )
                  : (request.status === "pending" ||
                      request.status === "accepted") && (
                      <Button
                        title="Cancel Request"
                        onPress={() => {
                          Alert.alert(
                            "Cancel Request",
                            "Are you sure you want to cancel this request?",
                            [
                              { text: "No", style: "cancel" },
                              {
                                text: "Yes",
                                style: "destructive",
                                onPress: () =>
                                  cancelRequest.mutate({
                                    requestId: request.id,
                                  }),
                              },
                            ]
                          );
                        }}
                        variant="secondary"
                        isLoading={cancelRequest.isPending}
                        style={styles.actionButton}
                      />
                    )}
              </Card>
            );
          }}
        />
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
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  requestCard: {
    marginBottom: 16,
    padding: 16,
  },
  tripInfo: {
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  routeText: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  tripMeta: {
    flexDirection: "row",
    gap: 8,
  },
  metaText: {
    fontSize: 13,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  userText: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  timeText: {
    fontSize: 12,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
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
