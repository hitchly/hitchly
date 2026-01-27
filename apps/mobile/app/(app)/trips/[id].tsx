import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "../../../lib/auth-client";
import { trpc } from "../../../lib/trpc";

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const { data: userProfile } = trpc.profile.getMe.useQuery();
  const isUserDriver = ["driver", "both"].includes(
    userProfile?.profile?.appRole || ""
  );

  const {
    data: trip,
    isLoading,
    error,
    refetch,
  } = trpc.trip.getTripById.useQuery({ tripId: id! }, { enabled: !!id });

  // Check if current user already has a request (computed early for logging)
  // Prioritize active requests (pending/accepted) over cancelled/rejected ones
  const userRequest =
    trip?.requests?.find(
      (req) =>
        req.riderId === currentUserId &&
        (req.status === "pending" || req.status === "accepted")
    ) || trip?.requests?.find((req) => req.riderId === currentUserId);
  const isDriver = currentUserId && trip?.driverId === currentUserId;
  const hasPendingRequest =
    userRequest?.status === "pending" || userRequest?.status === "accepted";
  const canJoin =
    !isDriver &&
    trip?.status !== "cancelled" &&
    (trip?.status === "pending" || trip?.status === "active") &&
    trip &&
    trip.maxSeats - trip.bookedSeats > 0 &&
    !hasPendingRequest;

  const cancelTrip = trpc.trip.cancelTrip.useMutation({
    onSuccess: async (data) => {
      utils.trip.getTrips.invalidate();
      utils.trip.getTripRequests.invalidate();
      await utils.trip.getTripById.invalidate({ tripId: id! });
      await refetch();
      Alert.alert("Success", "Trip cancelled successfully", [
        {
          text: "OK",
          onPress: () => router.push("/trips" as any),
        },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const cancelTripRequest = trpc.trip.cancelTripRequest.useMutation({
    onSuccess: async () => {
      await utils.trip.getTripById.invalidate({ tripId: id! });
      utils.trip.getTripRequests.invalidate();
      utils.trip.getTrips.invalidate();
      // Refetch trip data to ensure UI updates
      await refetch();
      Alert.alert("Success", "Request cancelled successfully", [
        {
          text: "OK",
        },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const createTripRequest = trpc.trip.createTripRequest.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Trip request sent successfully", [
        {
          text: "OK",
          onPress: () => refetch(),
        },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const simulateDriverComplete = trpc.admin.simulateDriverComplete.useMutation({
    onSuccess: () => {
      utils.trip.getTripById.invalidate();
      utils.trip.getTripRequests.invalidate();
      Alert.alert("Simulation complete", "Driver flow simulated for this trip");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const startTrip = trpc.trip.startTrip.useMutation({
    onSuccess: () => {
      if (id) {
        router.push(`/trips/${id}/drive` as any);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const formatCityProvince = (address?: string | null) => {
    if (!address) return "";
    const parts = address.split(",").map((p) => p.trim());
    if (parts.length < 2) return address;
    const province = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    return `${city}, ${province}`;
  };

  const canStartRide = (
    departureTime: Date | string
  ): { canStart: boolean; availableAt?: Date } => {
    const departure =
      typeof departureTime === "string"
        ? new Date(departureTime)
        : departureTime;
    const now = new Date();
    const tenMinutesBefore = new Date(departure.getTime() - 10 * 60 * 1000);

    if (now >= tenMinutesBefore) {
      return { canStart: true };
    }

    return { canStart: false, availableAt: tenMinutesBefore };
  };

  const handleCancel = () => {
    Alert.alert("Cancel Trip", "Are you sure you want to cancel this trip?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => {
          if (id) {
            cancelTrip.mutate({ tripId: id });
          }
        },
      },
    ]);
  };

  // Handle back navigation helper
  const handleBackNavigation = () => {
    if (isUserDriver) {
      router.push("/trips" as any);
    } else {
      router.back();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackNavigation}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackNavigation}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip not found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleBackNavigation}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#FFA500";
      case "active":
        return "#007AFF";
      case "in_progress":
        return "#34C759";
      case "completed":
        return "#34C759";
      case "cancelled":
        return "#FF3B30";
      default:
        return "#666";
    }
  };

  const formatStatus = (status: string) => {
    if (status === "in_progress") {
      return "IN PROGRESS";
    }
    return status.toUpperCase();
  };

  const canCancel =
    isDriver && (trip?.status === "pending" || trip?.status === "active");

  // Compute start ride availability for drivers with active trips
  const startRideInfo =
    isDriver && trip.status === "active"
      ? canStartRide(trip.departureTime)
      : null;

  const riderEtaDetails = (() => {
    if (
      isDriver ||
      !trip ||
      (trip.status !== "active" && trip.status !== "in_progress")
    ) {
      return null;
    }
    if (!userRequest) return null;
    if (userRequest.status === "accepted") {
      return {
        title: "Driver en route",
        message: "Driver arriving in 5 minutes (placeholder)",
        sub: trip.origin
          ? `Pickup: ${formatCityProvince(trip.origin)}`
          : undefined,
      };
    }
    if (userRequest.status === "on_trip") {
      const onTripRequests =
        trip.requests?.filter((r) => r.status === "on_trip") || [];
      const idx = onTripRequests.findIndex((r) => r.id === userRequest.id);
      if (idx >= 0 && onTripRequests.length > 1) {
        return {
          title: "On the way",
          message: `Dropping passengers off, you're ${formatOrdinal(
            idx + 1
          )} to be dropped off`,
          sub: "ETA placeholders to be replaced with live data",
        };
      }
      return {
        title: "On the way",
        message: "Arriving at destination in 10 minutes (placeholder)",
        sub: trip.destination
          ? formatCityProvince(trip.destination)
          : undefined,
      };
    }
    return null;
  })();

  // Handle back navigation - drivers should go to trips list, riders can go back
  const handleBack = () => {
    if (isDriver) {
      router.push("/trips" as any);
    } else {
      router.push("/requests" as any);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Status Badge */}
          <View style={styles.statusSection}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(trip.status) },
              ]}
            >
              <Text style={styles.statusText}>{formatStatus(trip.status)}</Text>
            </View>
          </View>

          {/* Route Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route</Text>
            {isDriver && trip.status === "active" && (
              <Text style={styles.startLocationLabel}>Start Location</Text>
            )}
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <View style={styles.routeDot} />
                <Text style={styles.routeText}>
                  {formatCityProvince(trip.origin)}
                </Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, styles.routeDotDestination]} />
                <Text style={styles.routeText}>
                  {formatCityProvince(trip.destination)}
                </Text>
              </View>
            </View>
          </View>

          {/* Rider ETA Section */}
          {!isDriver && riderEtaDetails && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ETA</Text>
              <Text style={styles.sectionHighlight}>
                {riderEtaDetails.title}
              </Text>
              <Text style={styles.sectionText}>{riderEtaDetails.message}</Text>
              {riderEtaDetails.sub && (
                <Text style={styles.sectionSubtext}>{riderEtaDetails.sub}</Text>
              )}
            </View>
          )}

          {/* Open Trip Screen Button for Riders (moved up for visibility) */}
          {!isDriver &&
            (userRequest?.status === "accepted" ||
              userRequest?.status === "on_trip") && (
              <View style={styles.actionsSection}>
                <TouchableOpacity
                  style={[styles.button, styles.startButton]}
                  onPress={() => {
                    if (id) {
                      router.push({
                        pathname: `/trips/${id}/ride` as any,
                        params: { referrer: `/trips/${id}` },
                      });
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Open Trip Screen</Text>
                </TouchableOpacity>
              </View>
            )}

          {/* Rider Safety Placeholders */}
          {!isDriver &&
            riderEtaDetails &&
            (trip.status === "active" || trip.status === "in_progress") && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Safety</Text>
                <View style={styles.safetyButtons}>
                  <TouchableOpacity
                    style={[styles.safetyButton, styles.safetyButtonOutline]}
                    onPress={() =>
                      Alert.alert(
                        "Safety",
                        "Emergency Contact - to be implemented by team"
                      )
                    }
                  >
                    <Text style={styles.safetyButtonText}>
                      Emergency Contact
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.safetyButton, styles.safetyButtonOutline]}
                    onPress={() =>
                      Alert.alert(
                        "Safety",
                        "Report Issue - to be implemented by team"
                      )
                    }
                  >
                    <Text style={styles.safetyButtonText}>Report Issue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          {/* Start Ride Button for Drivers */}
          {startRideInfo && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[
                  styles.button,
                  startRideInfo.canStart
                    ? styles.startButton
                    : styles.startButtonDisabled,
                ]}
                onPress={() => {
                  if (startRideInfo.canStart && id) {
                    Alert.alert(
                      "Start Ride",
                      "Start this ride? This will mark the trip as in progress.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Start",
                          onPress: () => {
                            startTrip.mutate({ tripId: id });
                          },
                        },
                      ]
                    );
                  }
                }}
                disabled={!startRideInfo.canStart || startTrip.isPending}
              >
                {startTrip.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {startRideInfo.canStart
                      ? "Start Ride"
                      : `Start Ride (Available at ${formatTime(startRideInfo.availableAt!)})`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Trip In Progress Button for Drivers */}
          {isDriver && trip.status === "in_progress" && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={() => {
                  if (id) {
                    router.push(`/trips/${id}/drive` as any);
                  }
                }}
              >
                <Text style={styles.buttonText}>Trip In Progress</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Test Driver Complete (simulation) */}
          {isDriver &&
            (trip.status === "active" || trip.status === "in_progress") && (
              <View style={styles.actionsSection}>
                <TouchableOpacity
                  style={[styles.button, styles.startButton]}
                  onPress={() => {
                    if (id) {
                      simulateDriverComplete.mutate({ tripId: id });
                    }
                  }}
                  disabled={simulateDriverComplete.isPending}
                >
                  {simulateDriverComplete.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Test Driver Complete</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

          {/* Rider Review/Tip Button */}
          {!isDriver && trip.status === "completed" && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={() => {
                  if (id) {
                    router.push(`/trips/${id}/review` as any);
                  }
                }}
              >
                <Text style={styles.buttonText}>Leave Review & Tip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Driver Rate Riders Button */}
          {isDriver && trip.status === "completed" && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[styles.button, styles.startButton]}
                onPress={() => {
                  if (id) {
                    router.push(`/trips/${id}/review` as any);
                  }
                }}
              >
                <Text style={styles.buttonText}>Rate Riders</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Trip Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Departure Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(trip.departureTime)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Departure Time:</Text>
              <Text style={styles.detailValue}>
                {formatTime(trip.departureTime)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Available Seats:</Text>
              <Text style={styles.detailValue}>
                {trip.maxSeats - trip.bookedSeats} seat
                {trip.maxSeats - trip.bookedSeats !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {/* Actions */}
          {isDriver && canCancel && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={cancelTrip.isPending}
              >
                {cancelTrip.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Cancel Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Join Trip Button removed from trip details - riders should join from Discover tab only */}

          {/* Trip Requests */}
          {trip.requests && trip.requests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Requests ({trip.requests.length})
              </Text>
              {trip.requests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <Text style={styles.requestStatus}>
                    Status: {request.status.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Request Status for Riders */}
          {!isDriver && hasPendingRequest && (
            <View style={styles.actionsSection}>
              <View style={[styles.button, styles.requestStatusButton]}>
                <Text style={styles.requestStatusText}>
                  {userRequest?.status === "pending"
                    ? "Request Pending"
                    : userRequest?.status === "accepted"
                      ? "Request Accepted"
                      : "Request Status"}
                </Text>
              </View>
              {(userRequest?.status === "pending" ||
                userRequest?.status === "accepted") && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, { marginTop: 8 }]}
                  onPress={() => {
                    Alert.alert(
                      "Cancel Request",
                      "Are you sure you want to cancel your request for this trip?",
                      [
                        { text: "No", style: "cancel" },
                        {
                          text: "Yes",
                          style: "destructive",
                          onPress: () => {
                            if (userRequest?.id) {
                              cancelTripRequest.mutate({
                                requestId: userRequest.id,
                              });
                            }
                          },
                        },
                      ]
                    );
                  }}
                  disabled={cancelTripRequest.isPending}
                >
                  {cancelTripRequest.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Cancel Request</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: "#ff3b30",
    textAlign: "center",
    marginBottom: 24,
  },
  statusSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  routeContainer: {
    marginTop: 8,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
    marginRight: 12,
  },
  routeDotDestination: {
    backgroundColor: "#34C759",
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#ddd",
    marginLeft: 5,
    marginBottom: 8,
  },
  routeText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  sectionHighlight: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 13,
    color: "#666",
  },
  safetyButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
  },
  safetyButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  safetyButtonOutline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
  },
  safetyButtonText: {
    fontWeight: "600",
    color: "#333",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  requestCard: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  requestStatus: {
    fontSize: 14,
    color: "#666",
  },
  actionsSection: {
    marginTop: 8,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#ff3b30",
  },
  requestStatusButton: {
    backgroundColor: "#f0f0f0",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  requestStatusText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  startLocationLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginBottom: 8,
  },
  startButton: {
    backgroundColor: "#34C759",
  },
  startButtonDisabled: {
    backgroundColor: "#999",
    opacity: 0.6,
  },
});
