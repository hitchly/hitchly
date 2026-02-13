import Ionicons from "@expo/vector-icons/Ionicons";
import { formatCityProvince } from "@hitchly/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

interface TripRequest {
  id: string;
  riderId: string;
  status: string;
  rider?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

export default function TripReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  const { data: trip } = trpc.trip.getTripById.useQuery(
    { tripId: id },
    { enabled: typeof id === "string" }
  );

  const isDriver = !!userId && trip?.driverId === userId;

  const [rating, setRating] = useState<number>(5);
  const [driverRatings, setDriverRatings] = useState<Record<string, number>>(
    {}
  );

  const [isDriverRated, setIsDriverRated] = useState(false);
  const [ratedRiderIds, setRatedRiderIds] = useState<Set<string>>(new Set());

  const submitRatingMutation = trpc.reviews.submitRating.useMutation({
    onError: (e) => {
      Alert.alert("Error", e.message);
    },
  });

  const handleRiderSubmit = () => {
    if (!trip?.driverId || !id) return;

    submitRatingMutation.mutate(
      {
        tripId: id,
        targetUserId: trip.driverId,
        rating: rating,
      },
      {
        onSuccess: () => {
          setIsDriverRated(true);
          Alert.alert("Success", "Rating submitted!");
        },
      }
    );
  };

  const handleDriverSubmit = (riderId: string) => {
    if (!id) return;
    const score = driverRatings[riderId] ?? 5;

    submitRatingMutation.mutate(
      {
        tripId: id,
        targetUserId: riderId,
        rating: score,
      },
      {
        onSuccess: () => {
          setRatedRiderIds((prev) => new Set(prev).add(riderId));
          Alert.alert("Success", "Rating submitted!");
        },
      }
    );
  };

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              router.back();
            }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.body}>
          <Text style={styles.muted}>Trip not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const driverRateableRequests: TripRequest[] = (trip.requests ?? []).filter(
    (r) => ["completed", "on_trip", "accepted"].includes(r.status)
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isDriver ? "Rate Riders" : "Rate Driver"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.body}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trip Summary</Text>
            <Text style={styles.line}>
              {formatCityProvince(trip.origin)} →{" "}
              {formatCityProvince(trip.destination)}
            </Text>
            <Text style={styles.muted}>
              {new Date(trip.departureTime).toLocaleDateString()}
            </Text>
          </View>

          {!isDriver && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How was your ride?</Text>

              <View
                style={[styles.stars, isDriverRated && styles.opacityMuted]}
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => {
                      if (!isDriverRated) setRating(v);
                    }}
                    disabled={isDriverRated}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={v <= rating ? "star" : "star-outline"}
                      size={40}
                      color={v <= rating ? "#FFB300" : "#E0E0E0"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (submitRatingMutation.isPending || isDriverRated) &&
                    styles.btnDisabled,
                ]}
                onPress={handleRiderSubmit}
                disabled={submitRatingMutation.isPending || isDriverRated}
              >
                <Text style={styles.primaryBtnText}>
                  {isDriverRated
                    ? "Rating Submitted"
                    : submitRatingMutation.isPending
                      ? "Submitting..."
                      : "Submit Rating"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isDriver && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rate your passengers</Text>
              {driverRateableRequests.length === 0 ? (
                <Text style={styles.muted}>No riders to rate.</Text>
              ) : (
                driverRateableRequests.map((riderRequest) => {
                  const riderId: string = riderRequest.riderId;
                  const currentRating = driverRatings[riderId] ?? 5;
                  const isRated = ratedRiderIds.has(riderId);

                  return (
                    <View key={riderRequest.id} style={styles.driverCard}>
                      <Text style={styles.riderName}>
                        {riderRequest.rider?.name ??
                          riderRequest.rider?.email ??
                          "Passenger"}
                      </Text>

                      <View
                        style={[
                          styles.starsSmall,
                          isRated && styles.opacityMuted,
                        ]}
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <TouchableOpacity
                            key={v}
                            disabled={isRated}
                            onPress={() => {
                              setDriverRatings((prev) => ({
                                ...prev,
                                [riderId]: v,
                              }));
                            }}
                          >
                            <Ionicons
                              name={
                                v <= currentRating ? "star" : "star-outline"
                              }
                              size={32}
                              color={v <= currentRating ? "#FFB300" : "#E0E0E0"}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.secondaryBtn,
                          isRated && styles.btnDisabled,
                        ]}
                        onPress={() => {
                          handleDriverSubmit(riderId);
                        }}
                        disabled={isRated}
                      >
                        <Text style={styles.secondaryBtnText}>
                          {isRated ? "Submitted" : "Submit"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  body: { padding: 16, gap: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  line: { fontSize: 15, color: "#111" },
  muted: { color: "#6B7280", fontSize: 14 },
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 10,
  },
  starsSmall: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
  },
  primaryBtn: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  btnDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 1,
  },
  driverCard: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 16,
    marginTop: 4,
  },
  riderName: { fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#374151", fontWeight: "600" },
  opacityMuted: { opacity: 0.5 },
});
