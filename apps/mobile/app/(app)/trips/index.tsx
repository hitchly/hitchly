import { useRouter } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "../../../lib/trpc";

export default function TripsScreen() {
  const router = useRouter();
  const {
    data: trips,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.trip.getTrips.useQuery();

  // Filter out cancelled trips
  const activeTrips =
    trips?.filter((trip) => trip.status !== "cancelled") || [];

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading trips...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/trips/create" as any)}
        >
          <Text style={styles.createButtonText}>+ Create Trip</Text>
        </TouchableOpacity>
      </View>

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
                    {trip.status.toUpperCase()}
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
