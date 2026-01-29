import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "../../../../lib/auth-client";
import { trpc } from "../../../../lib/trpc";

const formatCurrency = (cents?: number | null) => {
  if (cents === null || cents === undefined) return "TBD";
  return `$${(cents / 100).toFixed(2)}`;
};

const formatCityProvince = (address?: string | null) => {
  if (!address) return "Location";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const city = parts[parts.length - 2];
    const province =
      parts[parts.length - 1].split(" ")[0] || parts[parts.length - 1];
    return `${city}, ${province}`;
  }
  return address;
};

export default function TripReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const { data: trip } = trpc.trip.getTripById.useQuery(
    { tripId: id! },
    { enabled: !!id }
  );

  const isDriver = !!userId && trip?.driverId === userId;

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [tipCents, setTipCents] = useState<number>(0);
  const [driverRatings, setDriverRatings] = useState<
    Record<string, { rating: number; comment: string }>
  >({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const submitReview = trpc.trip.submitTripReview.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Review submitted (placeholder).");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const submitRiderReview = trpc.trip.submitRiderReview.useMutation({
    onSuccess: () => {
      setSubmittingId(null);
      Alert.alert("Success", "Rating submitted.");
    },
    onError: (e) => {
      setSubmittingId(null);
      Alert.alert("Error", e.message);
    },
  });

  const submitTip = trpc.trip.submitTripTip.useMutation({
    onSuccess: () => {
      Alert.alert(
        "Success",
        "Tip submitted (placeholder). Tips will appear 1 hour after."
      );
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const tipPresets = useMemo(
    () => [
      { label: "$2", cents: 200 },
      { label: "$5", cents: 500 },
      { label: "$10", cents: 1000 },
    ],
    []
  );

  if (!trip) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & Tip</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.body}>
          <Text style={styles.muted}>Trip not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const driverRateableRequests =
    trip.requests?.filter(
      (r) =>
        r.status === "completed" ||
        r.status === "on_trip" ||
        r.status === "accepted"
    ) || [];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isDriver ? "Rate Riders" : "Review & Tip"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.body}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Trip Summary</Text>
                <Text style={styles.line}>
                  {formatCityProvince(trip.origin)} →{" "}
                  {formatCityProvince(trip.destination)}
                </Text>
                {!isDriver && (
                  <>
                    <Text style={styles.muted}>
                      Fare: {formatCurrency(null)} (placeholder)
                    </Text>
                    <Text style={styles.muted}>
                      Tips will appear 1 hour after.
                    </Text>
                  </>
                )}
              </View>

              {!isDriver && (
                <>
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Rating</Text>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <TouchableOpacity
                          key={v}
                          onPress={() => setRating(v)}
                          accessibilityRole="button"
                        >
                          <Ionicons
                            name={v <= rating ? "star" : "star-outline"}
                            size={28}
                            color={v <= rating ? "#FFB300" : "#999"}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      value={comment}
                      onChangeText={setComment}
                      style={styles.input}
                      placeholder="Leave a comment..."
                      multiline
                      blurOnSubmit={false}
                    />
                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        submitReview.isPending && styles.btnDisabled,
                      ]}
                      onPress={() =>
                        submitReview.mutate({ tripId: id!, rating, comment })
                      }
                      disabled={submitReview.isPending}
                    >
                      <Text style={styles.primaryBtnText}>Submit Review</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Tip</Text>
                    <View style={styles.tipRow}>
                      {tipPresets.map((p) => (
                        <TouchableOpacity
                          key={p.cents}
                          style={[
                            styles.tipPill,
                            tipCents === p.cents && styles.tipPillActive,
                          ]}
                          onPress={() => {
                            Keyboard.dismiss();
                            setTipCents(p.cents);
                          }}
                        >
                          <Text style={styles.tipPillText}>{p.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.muted}>
                      Selected tip: {formatCurrency(tipCents)}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        submitTip.isPending && styles.btnDisabled,
                      ]}
                      onPress={() =>
                        submitTip.mutate({ tripId: id!, tipCents })
                      }
                      disabled={submitTip.isPending}
                    >
                      <Text style={styles.primaryBtnText}>Submit Tip</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {isDriver && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Rate Riders</Text>
                  {driverRateableRequests.length === 0 ? (
                    <Text style={styles.muted}>No riders to rate.</Text>
                  ) : (
                    driverRateableRequests.map((riderRequest) => {
                      const riderId = riderRequest.riderId;
                      const current = driverRatings[riderId] || {
                        rating: 5,
                        comment: "",
                      };
                      return (
                        <View key={riderRequest.id} style={styles.driverCard}>
                          <Text style={styles.line}>
                            {riderRequest.rider?.name ||
                              riderRequest.rider?.email ||
                              "Rider"}
                          </Text>
                          <View style={styles.stars}>
                            {[1, 2, 3, 4, 5].map((v) => (
                              <TouchableOpacity
                                key={v}
                                onPress={() =>
                                  setDriverRatings((prev) => ({
                                    ...prev,
                                    [riderId]: { ...current, rating: v },
                                  }))
                                }
                                accessibilityRole="button"
                              >
                                <Ionicons
                                  name={
                                    v <= current.rating
                                      ? "star"
                                      : "star-outline"
                                  }
                                  size={24}
                                  color={
                                    v <= current.rating ? "#FFB300" : "#999"
                                  }
                                />
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TextInput
                            value={current.comment}
                            onChangeText={(text) =>
                              setDriverRatings((prev) => ({
                                ...prev,
                                [riderId]: { ...current, comment: text },
                              }))
                            }
                            style={[styles.input, { minHeight: 70 }]}
                            placeholder="Leave a comment..."
                            multiline
                            blurOnSubmit={false}
                          />
                          <TouchableOpacity
                            style={[
                              styles.primaryBtn,
                              submittingId === riderId && styles.btnDisabled,
                            ]}
                            onPress={() => {
                              setSubmittingId(riderId);
                              submitRiderReview.mutate({
                                tripId: id!,
                                riderId,
                                rating: current.rating,
                                comment: current.comment,
                              });
                            }}
                            disabled={submittingId === riderId}
                          >
                            <Text style={styles.primaryBtnText}>
                              Submit Rating
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  body: { padding: 16, gap: 12 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  line: { fontSize: 14, color: "#111" },
  muted: { color: "#666" },
  stars: { flexDirection: "row", gap: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    minHeight: 90,
    textAlignVertical: "top",
  },
  primaryBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  tipRow: { flexDirection: "row", gap: 10 },
  tipPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tipPillActive: { backgroundColor: "#E6F0FF", borderColor: "#007AFF" },
  tipPillText: { fontWeight: "600" },
  driverCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginTop: 10,
  },
});
