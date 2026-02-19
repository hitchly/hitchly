// TODO: fix lint errors in this file and re-enable linting
/* eslint-disable */

import Ionicons from "@expo/vector-icons/Ionicons";
import { formatCityProvince, formatOrdinal } from "@hitchly/utils";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authClient } from "@/lib/auth-client";
import { openStopNavigation } from "@/lib/navigation";
import { isTestAccount } from "@/lib/test-accounts";
import { trpc } from "@/lib/trpc";

export default function RideScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;
  const { data: userProfile } = trpc.profile.getMe.useQuery();
  const userEmail = userProfile?.email;
  const isTestUser = isTestAccount(userEmail);

  const {
    data: trip,
    isLoading,
    refetch,
  } = trpc.trip.getTripById.useQuery({ tripId: id }, { enabled: !!id });

  const userRequest = trip?.requests?.find(
    (req) => req.riderId === currentUserId
  );

  const confirmRiderPickup = trpc.trip.confirmRiderPickup.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert("Success", "Pickup confirmed");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const isCompleted = userRequest?.status === "completed";
  useEffect(() => {
    if (isCompleted && id) {
      router.push(`/trips/${id}/review` as Href);
    }
  }, [id, isCompleted, router]);

  const handleBack = () => {
    router.push(`/trips/${id}` as Href);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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

  if (!trip || !userRequest) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip In Progress</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Trip or request not found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              router.push(`/trips/${id}` as any);
            }}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAccepted = userRequest.status === "accepted";
  const isOnTrip = userRequest.status === "on_trip";
  const pickupConfirmed = !!userRequest.riderPickupConfirmedAt;

  const dropoffOrder = (() => {
    if (!isOnTrip) return null;
    const onTripRequests =
      trip.requests?.filter((r) => r.status === "on_trip") || [];
    const idx = onTripRequests.findIndex((r) => r.id === userRequest.id);
    if (idx >= 0 && onTripRequests.length > 1) {
      return idx + 1;
    }
    return null;
  })();

  const handleConfirmPickup = () => {
    Alert.alert(
      "Confirm Pickup",
      "Confirm that you have been picked up by the driver?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            confirmRiderPickup.mutate({ requestId: userRequest.id });
          },
        },
      ]
    );
  };

  const handleOpenMaps = () => {
    if (isAccepted) {
      openStopNavigation(trip.originLat || 0, trip.originLng || 0);
    } else if (isOnTrip) {
      const dropoffLat = userRequest.dropoffLat ?? trip.destLat;
      const dropoffLng = userRequest.dropoffLng ?? trip.destLng;
      if (dropoffLat && dropoffLng) {
        openStopNavigation(dropoffLat, dropoffLng);
      }
    }
  };

  const getStatusMessage = () => {
    if (isAccepted) {
      return {
        title: "Waiting for Pickup",
        message: pickupConfirmed
          ? "Pickup confirmed - waiting for driver"
          : "Driver arriving in 5 minutes (placeholder)",
        location: formatCityProvince(trip.origin),
      };
    }
    if (isOnTrip) {
      if (dropoffOrder) {
        return {
          title: "On the way",
          message: `Dropping passengers off, you're ${formatOrdinal(
            dropoffOrder
          )} to be dropped off`,
          location: formatCityProvince(trip.destination),
        };
      }
      return {
        title: "On the way",
        message: "Arriving at destination in 10 minutes (placeholder)",
        location: formatCityProvince(trip.destination),
      };
    }
    if (isCompleted) {
      return {
        title: "Trip Completed",
        message: "Thank you for riding with us!",
        location: formatCityProvince(trip.destination),
      };
    }
    return null;
  };

  const statusInfo = getStatusMessage();

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

      <View style={styles.content}>
        {statusInfo ? (
          <View style={styles.stopCard}>
            <Text style={styles.stopType}>{statusInfo.title}</Text>
            <Text style={styles.passengerName}>{statusInfo.message}</Text>
            <Text style={styles.location}>{statusInfo.location}</Text>

            {isAccepted && !pickupConfirmed && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleConfirmPickup}
                disabled={confirmRiderPickup.isPending}
              >
                {confirmRiderPickup.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Picked Up</Text>
                )}
              </TouchableOpacity>
            )}

            {isAccepted && pickupConfirmed && (
              <View style={styles.confirmedContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.confirmedText}>Pickup Confirmed</Text>
              </View>
            )}

            {!isCompleted && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleOpenMaps}
              >
                <Ionicons name="map-outline" size={20} color="#007AFF" />
                <Text style={styles.secondaryButtonText}>Open in Maps</Text>
              </TouchableOpacity>
            )}

            {/* Test Driver Actions */}
            {!isCompleted && isTestUser && (
              <View style={styles.testButtons}>
                {isAccepted && pickupConfirmed && (
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => {
                      Alert.alert(
                        "Test Driver Pickup",
                        "Simulate driver picking you up?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Confirm",
                            onPress: () => {
                              // TODO implement confirm pickup
                              console.log("Fix me: confirm pickup");
                            },
                          },
                        ]
                      );
                    }}
                    disabled={
                      // TODO implement confirm pickup
                      false
                    }
                  >
                    {
                      // TODO implement confirm pickup
                      false ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="car-outline" size={20} color="#fff" />
                          <Text style={styles.testButtonText}>
                            Test Driver Pickup
                          </Text>
                        </>
                      )
                    }
                  </TouchableOpacity>
                )}
                {isOnTrip && (
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => {
                      Alert.alert(
                        "Test Driver Drop Off",
                        "Simulate driver dropping you off?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Confirm",
                            onPress: () => {
                              dropoffOrder;
                            },
                          },
                        ]
                      );
                    }}
                    disabled={
                      false
                      // TODO: implement real drop off
                    }
                  >
                    {
                      // TODO: implement real drop off
                      false ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons
                            name="exit-outline"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.testButtonText}>
                            Test Driver Drop Off
                          </Text>
                        </>
                      )
                    }
                  </TouchableOpacity>
                )}
                {/* Notification Test Buttons */}
                {isAccepted && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.testButton,
                        { backgroundColor: "#007AFF" },
                      ]}
                      onPress={() => {
                        // TODO implement real start trip
                        console.log("Fix me: Starting trip notification!");
                      }}
                      disabled={
                        // TODO implement real start trip
                        false
                      }
                    >
                      {
                        // TODO implement real start trip
                        false ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons
                              name="notifications-outline"
                              size={20}
                              color="#fff"
                            />
                            <Text style={styles.testButtonText}>
                              Test Trip Start Notification
                            </Text>
                          </>
                        )
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.testButton,
                        { backgroundColor: "#FF3B30" },
                      ]}
                      onPress={() => {
                        // TODO: Implement cancelling trip functionality
                        console.log("Fix me: cancel trip");
                      }}
                      disabled={
                        // TODO: Implement cancelling trip functionality
                        false
                      }
                    >
                      {
                        // TODO: Implement cancelling trip functionality
                        false ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons
                              name="close-circle-outline"
                              size={20}
                              color="#fff"
                            />
                            <Text style={styles.testButtonText}>
                              Test Trip Cancel Notification
                            </Text>
                          </>
                        )
                      }
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Safety Buttons */}
            {!isCompleted && (
              <View style={styles.safetyButtons}>
                <TouchableOpacity
                  style={styles.safetyButton}
                  onPress={() => {
                    if (id) {
                      router.push({
                        pathname: "/safety" as any,
                        params: { mode: "emergency", tripId: id },
                      });
                    }
                  }}
                >
                  <Ionicons name="shield-outline" size={20} color="#666" />
                  <Text style={styles.safetyButtonText}>Emergency Contact</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.safetyButton}
                  onPress={() => {
                    if (id) {
                      router.push({
                        pathname: "/safety" as any,
                        params: { mode: "report", tripId: id },
                      });
                    }
                  }}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color="#666"
                  />
                  <Text style={styles.safetyButtonText}>Report Issue</Text>
                </TouchableOpacity>
              </View>
            )}
            {isCompleted && (
              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 16 }]}
                onPress={() => {
                  if (id) {
                    router.push(`/trips/${id}/review` as Href);
                  }
                }}
              >
                <Text style={styles.primaryButtonText}>Leave Review & Tip</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>
              No active trip information available.
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
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  confirmedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#f0f9f4",
    borderRadius: 8,
  },
  confirmedText: {
    color: "#34C759",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  testButtons: {
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    gap: 8,
  },
  testButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  safetyButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  safetyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f8f9fa",
  },
  safetyButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
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
