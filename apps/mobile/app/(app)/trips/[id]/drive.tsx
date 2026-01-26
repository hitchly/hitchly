import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "../../../../lib/trpc";
import { openStopNavigation } from "../../../../lib/navigation";

type Stop = {
  type: "pickup" | "dropoff";
  requestId: string;
  passengerName: string;
  location: string;
  lat: number;
  lng: number;
};

const getCurrentStop = (trip: any, requests: any[]): Stop | null => {
  if (!trip || !requests || requests.length === 0) {
    return null;
  }

  // Filter to accepted/on_trip/completed requests (sorted by backend)
  const activeRequests = requests.filter(
    (req) =>
      req.status === "accepted" ||
      req.status === "on_trip" ||
      req.status === "completed"
  );

  if (activeRequests.length === 0) {
    return null;
  }

  // Find first incomplete stop
  // Process pickups first, then dropoffs
  for (const request of activeRequests) {
    // Check for pickup (status is accepted)
    if (request.status === "accepted") {
      return {
        type: "pickup",
        requestId: request.id,
        passengerName: request.rider?.name || "Passenger",
        location: trip.origin, // Use trip origin as pickup location display
        lat: request.pickupLat,
        lng: request.pickupLng,
      };
    }
  }

  // Then check for dropoffs (status is on_trip)
  for (const request of activeRequests) {
    if (request.status === "on_trip") {
      const dropoffLat = request.dropoffLat ?? trip.destLat;
      const dropoffLng = request.dropoffLng ?? trip.destLng;
      if (dropoffLat && dropoffLng) {
        return {
          type: "dropoff",
          requestId: request.id,
          passengerName: request.rider?.name || "Passenger",
          location: trip.destination, // Use trip destination as dropoff location display
          lat: dropoffLat,
          lng: dropoffLng,
        };
      }
    }
  }

  // All stops completed
  return null;
};

export default function DriveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: trip,
    isLoading,
    refetch,
  } = trpc.trip.getTripById.useQuery({ tripId: id! }, { enabled: !!id });

  const updatePassengerStatus = trpc.trip.updatePassengerStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const completeTrip = trpc.trip.completeTrip.useMutation({
    onSuccess: () => {
      if (id) {
        router.push(`/trips/${id}` as any);
      }
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

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
          <Text style={styles.headerTitle}>Trip In Progress</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading trip...</Text>
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
          <Text style={styles.headerTitle}>Trip In Progress</Text>
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

  const currentStop = getCurrentStop(trip, trip.requests || []);

  // Check if all passengers are completed
  const allCompleted =
    trip.requests &&
    trip.requests.length > 0 &&
    trip.requests.every(
      (req: any) =>
        req.status === "completed" ||
        req.status === "rejected" ||
        req.status === "cancelled"
    );

  // Auto-complete trip if all passengers are done
  if (
    allCompleted &&
    trip.status === "in_progress" &&
    !completeTrip.isPending
  ) {
    completeTrip.mutate({ tripId: id! });
  }

  const handleAction = () => {
    if (!currentStop) return;

    const action = currentStop.type === "pickup" ? "pickup" : "dropoff";
    const actionText =
      currentStop.type === "pickup"
        ? "Passenger Picked Up"
        : "Passenger Dropped Off";

    Alert.alert(
      actionText,
      `Confirm that you have ${action === "pickup" ? "picked up" : "dropped off"} ${currentStop.passengerName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            updatePassengerStatus.mutate({
              tripId: id!,
              requestId: currentStop.requestId,
              action,
            });
          },
        },
      ]
    );
  };

  const handleOpenMaps = () => {
    if (!currentStop) return;
    openStopNavigation(currentStop.lat, currentStop.lng);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip In Progress</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {currentStop ? (
          <View style={styles.stopCard}>
            <Text style={styles.stopType}>
              {currentStop.type === "pickup"
                ? "Pickup Passenger"
                : "Drop Off Passenger"}
            </Text>
            <Text style={styles.passengerName}>
              {currentStop.passengerName}
            </Text>
            <Text style={styles.location}>{currentStop.location}</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAction}
              disabled={updatePassengerStatus.isPending}
            >
              {updatePassengerStatus.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {currentStop.type === "pickup"
                    ? "Passenger Picked Up"
                    : "Passenger Dropped Off"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleOpenMaps}
            >
              <Ionicons name="map-outline" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>
              All passengers have been picked up and dropped off.
            </Text>
            <Text style={styles.completedSubtext}>Completing trip...</Text>
          </View>
        )}
      </View>
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
  content: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  stopCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  passengerName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  location: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  completedContainer: {
    alignItems: "center",
    padding: 24,
  },
  completedText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  completedSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
