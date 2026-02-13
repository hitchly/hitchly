import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  SwipeDeck,
  RiderCard,
  type TripRequestWithDetails,
} from "../../components/swipe";
import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";
import { isTestAccount } from "../../lib/test-accounts";
import { trpc } from "../../lib/trpc";

export default function RequestsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const utils = trpc.useUtils();

  // Get user profile to determine role
  const { data: userProfile, isLoading: isLoadingProfile } =
    trpc.profile.getMe.useQuery(undefined, { enabled: !!userId });

  const appRole = userProfile?.profile?.appRole || "rider";
  const isDriver = appRole === "driver";
  const userEmail = userProfile?.email;
  const isTestUser = isTestAccount(userEmail);

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

  // #region agent log
  React.useEffect(() => {
    if (riderRequests !== undefined) {
      fetch(
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "requests.tsx:riderRequestsQuery",
            message: "Rider requests query result",
            data: {
              requestsCount: riderRequests?.length || 0,
              requestStatuses:
                riderRequests?.map((r) => ({
                  id: r.id,
                  status: r.status,
                  riderId: r.riderId,
                })) || [],
              isLoading: isLoadingRiderRequests,
              isRefetching: isRefetchingRiderRequests,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "C",
          }),
        }
      ).catch(() => {});
    }
  }, [riderRequests, isLoadingRiderRequests, isRefetchingRiderRequests]);

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
  const requests = useMemo(
    () => (isDriverView ? allDriverRequests : riderRequests || []),
    [isDriverView, allDriverRequests, riderRequests]
  );

  // Filter out requests for cancelled trips
  const filteredRequests = useMemo(
    () =>
      requests.filter((req) => {
        if (!req.trip) return false;
        return req.trip.status !== "cancelled";
      }),
    [requests]
  );

  // Filter pending requests for swipe view
  const pendingRequests = useMemo(() => {
    if (!isDriverView) return [];
    return filteredRequests.filter(
      (req) => req.status === "pending"
    ) as TripRequestWithDetails[];
  }, [filteredRequests, isDriverView]);

  const acceptRequest = trpc.trip.acceptTripRequest.useMutation({
    onSuccess: (data) => {
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

  const [dummyPassengersEnabled, setDummyPassengersEnabled] = useState(false);
  const createDummyPassengers = trpc.admin.createDummyPassengers.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate();
      utils.trip.getTrips.invalidate();
      if (isDriver) {
        refetchFirstTrip();
      }
      Alert.alert("Success", "5 dummy passengers created!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const deleteDummyPassengers = trpc.admin.deleteDummyPassengers.useMutation({
    onSuccess: () => {
      utils.trip.getTripRequests.invalidate();
      utils.trip.getTrips.invalidate();
      if (isDriver) {
        refetchFirstTrip();
      }
      Alert.alert("Success", "Dummy passengers removed!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const registerPushToken = trpc.profile.updatePushToken.useMutation();

  const createTestRequest = trpc.admin.createTestRequest.useMutation({
    onSuccess: async (data) => {
      // Register push token when creating test request
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === "granted") {
          // Get projectId from Constants or environment variable
          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ||
            process.env.EXPO_PUBLIC_PROJECT_ID ||
            Constants.expoConfig?.extra?.projectId;

          // Only try to get push token if projectId is available
          // In Expo Go, push notifications may not work anyway
          if (projectId) {
            const tokenData = await Notifications.getExpoPushTokenAsync({
              projectId,
            });
            await registerPushToken.mutateAsync({
              pushToken: tokenData.data,
            });
          }
        }
      } catch (error: any) {
        // Don't block test request creation if push token registration fails
        console.error(
          "Failed to register push token:",
          error?.message || error
        );
      }
      utils.trip.getTripRequests.invalidate();
      refetchRiderRequests();
      Alert.alert("Success", "Test request created for rider view");
    },
    onError: (error) => {
      Alert.alert(
        "Error",
        error.message ===
          "You already have a pending or accepted request for this trip"
          ? "You already have a pending or accepted test request. Cancel it from the Trips screen before creating another."
          : error.message
      );
    },
  });

  const handleDummyPassengersToggle = (value: boolean) => {
    setDummyPassengersEnabled(value);
    if (value && firstTripId) {
      createDummyPassengers.mutate({ tripId: firstTripId });
    } else if (!value && firstTripId) {
      deleteDummyPassengers.mutate({ tripId: firstTripId });
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
        {isDriverView && isTestUser && firstTripId && (
          <View style={styles.dummyToggleContainer}>
            <Text
              style={[styles.dummyToggleLabel, { color: colors.textSecondary }]}
            >
              Test Mode
            </Text>
            <Switch
              value={dummyPassengersEnabled}
              onValueChange={handleDummyPassengersToggle}
              disabled={
                createDummyPassengers.isPending ||
                deleteDummyPassengers.isPending
              }
            />
          </View>
        )}
        {!isDriverView && isTestUser && (
          <TouchableOpacity
            style={[
              styles.testButton,
              createTestRequest.isPending && styles.testButtonDisabled,
            ]}
            onPress={() => {
              const hasActiveRequest = filteredRequests.some(
                (req) => req.status === "pending" || req.status === "accepted"
              );
              if (hasActiveRequest) {
                Alert.alert(
                  "Request Exists",
                  "You already have a pending or accepted test request. Cancel it from the Trips screen before creating another."
                );
                return;
              }
              createTestRequest.mutate({});
            }}
            disabled={createTestRequest.isPending}
          >
            <Text style={[styles.testButtonText, { color: colors.text }]}>
              {createTestRequest.isPending ? "Creating..." : "Add Test Request"}
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
                    acceptRequest.mutate(
                      { requestId: request.id },
                      {
                        onSuccess: () => {
                          // Placeholder for payment module: place rider funds on hold when driver accepts.
                          const riderLabel =
                            request.rider?.name ||
                            request.rider?.email ||
                            "this rider";
                          Alert.alert(
                            "Payment (Placeholder)",
                            `Funds will be placed on hold for ${riderLabel} now.\n\n(Teammate: implement payment hold here when driver accepts.)`
                          );
                        },
                      }
                    );
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
      ) : !isDriverView && filteredRequests.length > 0 ? (
        <ScrollView style={styles.riderRequestsList}>
          {filteredRequests.map((request) => {
            const getRequestStatusColor = (status: string) => {
              switch (status) {
                case "pending":
                  return colors.warning || "#FFA500";
                case "accepted":
                  return colors.success || "#34C759";
                case "rejected":
                  return colors.error || "#FF3B30";
                case "completed":
                  return colors.success || "#34C759";
                case "cancelled":
                  return colors.textSecondary || "#666";
                default:
                  return colors.textSecondary || "#666";
              }
            };

            const formatRequestStatus = (status: string) => {
              return (
                status.charAt(0).toUpperCase() +
                status.slice(1).replace("_", " ")
              );
            };

            return (
              <TouchableOpacity
                key={request.id}
                style={[
                  styles.requestCard,
                  { backgroundColor: colors.surface },
                ]}
                onPress={() => {
                  if (request.trip) {
                    router.push(`/trips/${request.trip.id}` as any);
                  }
                }}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={[styles.requestRoute, { color: colors.text }]}>
                      {request.trip?.origin || "Unknown"} →{" "}
                      {request.trip?.destination || "Unknown"}
                    </Text>
                    {request.trip?.departureTime && (
                      <Text
                        style={[
                          styles.requestTime,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {new Date(request.trip.departureTime).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.requestStatusBadge,
                      {
                        backgroundColor: getRequestStatusColor(request.status),
                      },
                    ]}
                  >
                    <Text style={styles.requestStatusText}>
                      {formatRequestStatus(request.status)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  dummyToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dummyToggleLabel: {
    fontSize: 14,
    fontWeight: "500",
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
  riderRequestsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestRoute: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 14,
  },
  requestStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  requestStatusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    marginLeft: 8,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
