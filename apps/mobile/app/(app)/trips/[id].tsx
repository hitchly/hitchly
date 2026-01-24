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

  const {
    data: trip,
    isLoading,
    refetch,
  } = trpc.trip.getTripById.useQuery({ tripId: id! }, { enabled: !!id });

  const cancelTrip = trpc.trip.cancelTrip.useMutation({
    onSuccess: () => {
      // Invalidate trips query to refresh the list
      utils.trip.getTrips.invalidate();
      utils.trip.getTripRequests.invalidate();
      Alert.alert("Success", "Trip cancelled successfully", [
        {
          text: "OK",
          onPress: () => router.push("/trips"),
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
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
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip not found</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
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
      case "completed":
        return "#34C759";
      case "cancelled":
        return "#FF3B30";
      default:
        return "#666";
    }
  };

  const isDriver = currentUserId && trip?.driverId === currentUserId;
  const canCancel =
    isDriver && (trip?.status === "pending" || trip?.status === "active");

  // Check if current user already has a request
  const userRequest = trip?.requests?.find(
    (req) => req.riderId === currentUserId
  );
  const hasPendingRequest =
    userRequest?.status === "pending" || userRequest?.status === "accepted";
  const canJoin =
    !isDriver &&
    (trip?.status === "pending" || trip?.status === "active") &&
    trip?.availableSeats > 0 &&
    !hasPendingRequest;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
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
              <Text style={styles.statusText}>{trip.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Route Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route</Text>
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <View style={styles.routeDot} />
                <Text style={styles.routeText}>{trip.origin}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, styles.routeDotDestination]} />
                <Text style={styles.routeText}>{trip.destination}</Text>
              </View>
            </View>
          </View>

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
                {trip.availableSeats} seat{trip.availableSeats !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

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

          {/* Join Trip Button for Riders */}
          {!isDriver && canJoin && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  if (id) {
                    createTripRequest.mutate({ tripId: id });
                  }
                }}
                disabled={createTripRequest.isPending}
              >
                {createTripRequest.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Join Trip</Text>
                )}
              </TouchableOpacity>
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
});
