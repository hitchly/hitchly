import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/context/theme-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export default function TripRequestsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const utils = trpc.useUtils();

  const { data: driverTrips } = trpc.trip.getTrips.useQuery(undefined, {
    enabled: !!userId && !tripId,
  });

  const {
    data: requestsData,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.trip.getTripRequests.useQuery(
    tripId ? { tripId } : { riderId: userId },
    { enabled: !!userId }
  );

  trpc.trip.getTripRequests.useQuery(
    { tripId: driverTrips?.[0]?.id ?? "" },
    {
      enabled: !!userId && !tripId && !!driverTrips && driverTrips.length > 0,
    }
  );

  const isDriverView =
    tripId !== undefined || (!!driverTrips && driverTrips.length > 0);

  const requests = requestsData ?? [];

  const acceptRequest = trpc.trip.acceptTripRequest.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate().catch(() => {
        /* Silently fail background refresh */
      });
      utils.trip.getTripById.invalidate().catch(() => {
        /* Silently fail background refresh */
      });
      utils.trip.getAvailableTrips.invalidate().catch(() => {
        /* Silently fail background refresh */
      });
      Alert.alert("Success", "Request accepted successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const rejectRequest = trpc.trip.rejectTripRequest.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate().catch(() => {
        /* Silently fail background refresh */
      });
      Alert.alert("Success", "Request rejected");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const cancelRequest = trpc.trip.cancelTripRequest.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate().catch(() => {
        /* Silently fail background refresh */
      });
      utils.trip.getTripById.invalidate().catch(() => {
        /* Silently fail background refresh */
      });
      utils.trip.getAvailableTrips.invalidate().catch(() => {
        /* Silently fail background refresh */
      });
      Alert.alert("Success", "Request cancelled");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

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
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {isDriverView ? "Trip Requests" : "My Requests"}
        </Text>
        <View style={styles.backButton} />
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="document-outline"
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
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch().catch(() => {
                  /* Refetch failed */
                });
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item: request }) => {
            const trip = request.trip;
            const rider = request.rider;

            return (
              <Card style={styles.requestCard}>
                {trip && (
                  <View style={styles.tripInfo}>
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
                  </View>
                )}

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

                <Text
                  style={[styles.timeText, { color: colors.textSecondary }]}
                >
                  Requested {formatDate(request.createdAt)}
                </Text>

                {isDriverView
                  ? request.status === "pending" && (
                      <View style={styles.actionRow}>
                        <Button
                          title="Accept"
                          onPress={() => {
                            Alert.alert(
                              "Accept Request",
                              `Accept ${rider?.name ?? rider?.email ?? "this rider"}'s request?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Accept",
                                  onPress: () => {
                                    acceptRequest.mutate({
                                      requestId: request.id,
                                    });
                                  },
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
                              `Reject ${rider?.name ?? rider?.email ?? "this rider"}'s request?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Reject",
                                  style: "destructive",
                                  onPress: () => {
                                    rejectRequest.mutate({
                                      requestId: request.id,
                                    });
                                  },
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
                                onPress: () => {
                                  cancelRequest.mutate({
                                    requestId: request.id,
                                  });
                                },
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
});
