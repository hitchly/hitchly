import { useRouter } from "expo-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NumericStepper } from "../../../components/ui/numeric-stepper";
import { trpc } from "../../../lib/trpc";
import { isTestAccount } from "../../../lib/test-accounts";
import { authClient } from "../../../lib/auth-client";

export default function TripsScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  authClient.useSession();
  const { data: userProfile } = trpc.profile.getMe.useQuery();
  const userEmail = useMemo(() => userProfile?.email, [userProfile?.email]);
  const isTestUser = useMemo(() => isTestAccount(userEmail), [userEmail]);
  const {
    data: trips,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.trip.getTrips.useQuery();
  const [showTestTripModal, setShowTestTripModal] = useState(false);
  const [passengerCount, setPassengerCount] = useState(1);

  const createTorontoTestTrip = trpc.admin.createTorontoTestTrip.useMutation({
    onSuccess: () => {
      utils.trip.getTrips.invalidate();
      setShowTestTripModal(false);
      Alert.alert("Success", "Test trip created successfully!");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Filter out cancelled trips - memoized to prevent recalculation on every render
  const activeTrips = useMemo(
    () => trips?.filter((trip) => trip.status !== "cancelled") || [],
    [trips]
  );

  // #region agent log - Performance debug
  useEffect(() => {
    if (trips) {
      fetch(
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "trips/index.tsx:render",
            message: "Trips screen render",
            data: {
              tripsCount: trips.length,
              activeTripsCount: activeTrips.length,
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "perf-debug",
            hypothesisId: "PERF1",
          }),
        }
      ).catch(() => {});
    }
  }, [trips, activeTrips.length]);
  // #endregion

  // Memoize formatters to prevent recreation on every render
  const formatDate = useCallback((date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const formatTime = useCallback((date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "pending":
        return "#FFA500";
      case "active":
        return "#007AFF";
      case "in_progress":
        return "#FF9500"; // Orange to distinguish from completed (green)
      case "completed":
        return "#34C759";
      case "cancelled":
        return "#FF3B30";
      default:
        return "#666";
    }
  }, []);

  const formatStatus = useCallback((status: string) => {
    if (status === "in_progress") {
      return "IN PROGRESS";
    }
    return status.toUpperCase();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading trips...</Text>
      </View>
    );
  }

  const handleAddTestTrip = () => {
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "trips/index.tsx:handleAddTestTrip",
        message: "Creating test trip",
        data: { passengerCount },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "M",
      }),
    }).catch(() => {});
    // #endregion
    createTorontoTestTrip.mutate({ passengerCount });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <View style={styles.headerButtons}>
          {isTestUser && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => setShowTestTripModal(true)}
            >
              <Text style={styles.testButtonText}>Add Test Trip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/trips/create" as any)}
          >
            <Text style={styles.createButtonText}>+ Create Trip</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showTestTripModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTestTripModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Test Trip</Text>
            <Text style={styles.modalSubtitle}>
              McMaster University → Toronto Union Station
            </Text>

            <View style={styles.passengerSelector}>
              <Text style={styles.passengerLabel}>
                Number of Passengers: {passengerCount}
              </Text>
              <NumericStepper
                value={passengerCount}
                onValueChange={(value) => {
                  // #region agent log
                  fetch(
                    "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        location: "trips/index.tsx:passengerCountChange",
                        message: "Passenger count changed",
                        data: { oldValue: passengerCount, newValue: value },
                        timestamp: Date.now(),
                        sessionId: "debug-session",
                        runId: "run1",
                        hypothesisId: "M",
                      }),
                    }
                  ).catch(() => {});
                  // #endregion
                  setPassengerCount(value);
                }}
                min={1}
                max={4}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowTestTripModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddTestTrip}
                disabled={createTorontoTestTrip.isPending}
              >
                {createTorontoTestTrip.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
          />
        }
      >
        {!activeTrips || activeTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No trips found</Text>
            <Text style={styles.emptySubtext}>
              Create your first trip to get started
            </Text>
          </View>
        ) : (
          activeTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              onPress={() => router.push(`/trips/${trip.id}` as any)}
            >
              <View style={styles.tripHeader}>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripOrigin}>{trip.origin}</Text>
                  <Text style={styles.tripArrow}>→</Text>
                  <Text style={styles.tripDestination}>{trip.destination}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(trip.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {formatStatus(trip.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.tripDetails}>
                <Text style={styles.tripDetail}>
                  {formatDate(trip.departureTime)} at{" "}
                  {formatTime(trip.departureTime)}
                </Text>
                <Text style={styles.tripDetail}>
                  {trip.maxSeats - trip.bookedSeats} seat
                  {trip.maxSeats - trip.bookedSeats !== 1 ? "s" : ""} available
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
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
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  testButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  passengerSelector: {
    marginBottom: 24,
  },
  passengerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonCancelText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonConfirm: {
    backgroundColor: "#007AFF",
  },
  modalButtonConfirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 48,
  },
  tripCard: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tripInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  tripOrigin: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  tripArrow: {
    fontSize: 16,
    color: "#666",
    marginHorizontal: 8,
  },
  tripDestination: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  tripDetails: {
    marginTop: 8,
  },
  tripDetail: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
