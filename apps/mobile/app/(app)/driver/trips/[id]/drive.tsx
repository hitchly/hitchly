//TODO: Fix eslint errors in this file and re-enable linting
/* eslint-disable */

import Ionicons from "@expo/vector-icons/Ionicons";
import { formatCityProvince } from "@hitchly/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
  TripCompletionSummary,
  type TripCompletionSummaryData,
} from "@/features/trips/components/TripCompletionSummary";
import { openStopNavigation } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";

interface Stop {
  type: "pickup" | "dropoff";
  requestId: string;
  passengerName: string;
  location: string;
  lat: number;
  lng: number;
}

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
        location: formatCityProvince(trip.origin),
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
          location: formatCityProvince(trip.destination),
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
  const utils = trpc.useUtils();
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryData, setSummaryData] =
    useState<TripCompletionSummaryData | null>(null);

  const {
    data: trip,
    isLoading,
    error,
    refetch,
  } = trpc.trip.getTripById.useQuery({ tripId: id }, { enabled: !!id });

  const updatePassengerStatus = trpc.trip.updatePassengerStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      // Check if rider hasn't confirmed pickup yet - show informational message instead of error
      if (error.message.includes("Rider has not confirmed pickup yet")) {
        Alert.alert(
          "Waiting for Confirmation",
          "Waiting for passenger to confirm pickup...",
          [{ text: "OK" }]
        );
      } else {
        // Show error for other cases
        Alert.alert("Error", error.message);
      }
    },
  });

  const startTrip = trpc.trip.startTrip.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const completeTrip = trpc.trip.completeTrip.useMutation({
    onSuccess: (result: any) => {
      // Invalidate queries to refresh UI
      utils.trip.getTrips.invalidate();
      utils.trip.getTripById.invalidate({ tripId: id });
      // Show driver completion summary (placeholder values until payment module is implemented).
      setSummaryData((result?.summary as TripCompletionSummaryData) ?? null);
      setSummaryVisible(true);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Compute derived state before early returns (needed for useEffect)
  const requests = useMemo(() => trip?.requests || [], [trip?.requests]);
  const currentStop = useMemo(
    () => (trip ? getCurrentStop(trip, requests) : null),
    [trip, requests]
  );
  const hasRequests = requests.length > 0;

  const allCompleted =
    hasRequests &&
    requests.every(
      (req: any) =>
        req.status === "completed" ||
        req.status === "rejected" ||
        req.status === "cancelled"
    );
  const hasPendingRequests = requests.some(
    (req: any) => req.status === "pending"
  );

  // Auto-complete trip if all passengers are done

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              router.back();
            }}
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
            onPress={() => {
              router.back();
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip In Progress</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip not found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              router.back();
            }}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleAction = () => {
    if (!currentStop) return;

    const action = currentStop.type === "pickup" ? "pickup" : "dropoff";

    // Check if rider has confirmed pickup (only for pickup actions)
    if (action === "pickup") {
      const currentRequest = requests.find(
        (req: any) => req.id === currentStop.requestId
      );
      if (currentRequest && !currentRequest.riderPickupConfirmedAt) {
        // Show informational message instead of allowing action
        Alert.alert(
          "Waiting for Confirmation",
          "Waiting for passenger to confirm pickup...",
          [{ text: "OK" }]
        );
        return;
      }
    }

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
            updatePassengerStatus.mutate(
              {
                tripId: id,
                requestId: currentStop.requestId,
                action,
              },
              {
                onSuccess: () => {
                  // Placeholder for payment module: charge rider when dropped off.
                  if (action === "dropoff") {
                    Alert.alert(
                      "Payment (Placeholder)",
                      `Transaction will complete now and ${currentStop.passengerName} will be charged.\n\n(Teammate: implement charge/capture here on passenger dropoff.)`
                    );
                  }
                },
              }
            );
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
      <TripCompletionSummary
        visible={summaryVisible}
        summary={summaryData}
        onClose={() => {
          setSummaryVisible(false);
          if (id) router.push(`/trips/${id}` as any);
        }}
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
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

            {/* Show waiting message if rider hasn't confirmed pickup */}
            {(() => {
              if (currentStop.type === "pickup") {
                const currentRequest = requests.find(
                  (req: any) => req.id === currentStop.requestId
                );
                const waitingForConfirmation =
                  currentRequest && !currentRequest.riderPickupConfirmedAt;
                if (waitingForConfirmation) {
                  return (
                    <View style={styles.waitingContainer}>
                      <Text style={styles.waitingText}>
                        Waiting for passenger to confirm pickup...
                      </Text>
                    </View>
                  );
                }
              }
              return null;
            })()}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (() => {
                  if (currentStop.type === "pickup") {
                    const currentRequest = requests.find(
                      (req: any) => req.id === currentStop.requestId
                    );
                    if (
                      currentRequest &&
                      !currentRequest.riderPickupConfirmedAt
                    ) {
                      return styles.primaryButtonDisabled;
                    }
                  }
                  return null;
                })(),
              ]}
              onPress={handleAction}
              disabled={(() => {
                if (updatePassengerStatus.isPending) return true;
                if (currentStop.type === "pickup") {
                  const currentRequest = requests.find(
                    (req: any) => req.id === currentStop.requestId
                  );
                  return (
                    currentRequest && !currentRequest.riderPickupConfirmedAt
                  );
                }
                return false;
              })()}
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
        ) : !hasRequests ? (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>
              No passengers on this trip yet.
            </Text>
            <Text style={styles.completedSubtext}>
              Passengers can join your trip from the trip details screen.
            </Text>
          </View>
        ) : hasPendingRequests ? (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>
              Waiting for passenger requests...
            </Text>
            <Text style={styles.completedSubtext}>
              Accept passenger requests from the trip details screen to start
              pickups.
            </Text>
          </View>
        ) : allCompleted ? (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>
              All passengers have been picked up and dropped off.
            </Text>
            <Text style={styles.completedSubtext}>Completing trip...</Text>
          </View>
        ) : (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>
              No active stops at this time.
            </Text>
            <Text style={styles.completedSubtext}>
              Check back later for passenger pickups.
            </Text>
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
  primaryButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  waitingContainer: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFC107",
  },
  waitingText: {
    color: "#856404",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
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
