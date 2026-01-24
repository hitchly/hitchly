import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Animated,
} from "react-native";
import { trpc } from "@/lib/trpc";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/theme-context";
import { useRouter } from "expo-router";
import { SwipeDeck, TripCard, type RideMatch } from "../../components/swipe";
import { DatePickerComponent } from "../../components/ui/date-picker";

// McMaster University coordinates (default destination)
const MCMASTER_COORDS = { lat: 43.2609, lng: -79.9192 };

export default function Matchmaking() {
  const { colors } = useTheme();
  const router = useRouter();
  const [desiredArrivalTime, setDesiredArrivalTime] = useState("09:00");
  const [desiredDate, setDesiredDate] = useState<Date | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [includeDummyMatches, setIncludeDummyMatches] = useState(false);
  const toggleAnim = useRef(new Animated.Value(0)).current;
  const utils = trpc.useUtils();

  // #region agent log
  const LOG_ENDPOINT =
    "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9";
  const log = (
    location: string,
    message: string,
    data: any,
    hypothesisId?: string
  ) => {
    fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location,
        message,
        data,
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId,
      }),
    }).catch(() => {});
  };
  // #endregion agent log

  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: includeDummyMatches ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [includeDummyMatches, toggleAnim]);

  // Get user profile with default location
  const { data: userProfile, isLoading: profileLoading } =
    trpc.profile.getMe.useQuery();

  // Build search params from user's profile - useMemo to stabilize object reference
  const searchParams = useMemo(() => {
    if (
      !userProfile?.profile?.defaultLat ||
      !userProfile?.profile?.defaultLong
    ) {
      return null;
    }
    return {
      origin: {
        lat: userProfile.profile.defaultLat,
        lng: userProfile.profile.defaultLong,
      },
      destination: MCMASTER_COORDS,
      desiredArrivalTime,
      desiredDate: desiredDate || undefined,
      maxOccupancy: 1,
      preference: "costPriority" as const,
      includeDummyMatches,
    };
  }, [
    userProfile?.profile?.defaultLat,
    userProfile?.profile?.defaultLong,
    desiredArrivalTime,
    desiredDate,
    includeDummyMatches,
  ]);

  // Only fetch matches if user has location set and has clicked search
  // Include includeDummyMatches in the query key to refetch when toggle changes
  const matchesQuery = trpc.matchmaking.findMatches.useQuery(searchParams!, {
    enabled: !!searchParams && hasSearched,
    // Refetch when toggle changes to ensure fresh results
    refetchOnMount: true,
  });

  // React Query will automatically refetch when searchParams changes (since it's the query key)
  // No need for manual refetch - the query key includes includeDummyMatches
  // #region agent log
  useEffect(() => {
    log(
      "matchmaking.tsx:98",
      "searchParams changed",
      {
        includeDummyMatches,
        searchParamsIncludeDummy: searchParams?.includeDummyMatches,
        hasSearchParams: !!searchParams,
        queryEnabled: !!searchParams && hasSearched,
      },
      "J"
    );
  }, [searchParams, includeDummyMatches, hasSearched]);
  // #endregion agent log

  // #region agent log
  useEffect(() => {
    if (matchesQuery.data) {
      log(
        "matchmaking.tsx:72",
        "Matches query data received",
        {
          matchCount: matchesQuery.data.length,
          includeDummyMatches,
          searchParamsIncludeDummy: searchParams?.includeDummyMatches,
          rideIds: matchesQuery.data.map((m) => m.rideId),
          dummyMatches: matchesQuery.data.filter((m) =>
            m.rideId.startsWith("dummy-")
          ).length,
        },
        "D"
      );
    }
  }, [matchesQuery.data, includeDummyMatches, searchParams]);
  // #endregion agent log

  const requestRideMutation = trpc.matchmaking.requestRide.useMutation({
    onSuccess: () => {
      Alert.alert(
        "Request Sent",
        "The driver has been notified of your request!"
      );
    },
    onError: (error: any) => {
      Alert.alert("Error", "Could not send request: " + error.message);
    },
  });

  const handleSwipeRight = (match: RideMatch) => {
    // Use matchmaking.requestRide (uses rideId from rides table)
    // Pickup location is the rider's origin (where they want to be picked up)
    if (!searchParams) {
      Alert.alert("Error", "Search parameters not available");
      return;
    }
    requestRideMutation.mutate({
      rideId: match.rideId,
      pickupLat: searchParams.origin.lat,
      pickupLng: searchParams.origin.lng,
    });
  };

  const handleSwipeLeft = () => {
    // Just discard, no action needed
  };

  const handleCardTap = (match: RideMatch) => {
    // Navigate to trip details
    router.push(`/(app)/trips/${match.rideId}`);
  };

  const handleDeckEmpty = () => {
    // Could fetch more matches here if pagination is supported
    Alert.alert(
      "No More Matches",
      "You've seen all available rides. Try adjusting your search criteria."
    );
  };

  const handleSearch = () => {
    if (!searchParams) {
      Alert.alert(
        "Location Required",
        "Please set your default location in your profile first."
      );
      return;
    }
    setHasSearched(true);
  };

  // --- STATE 1: PROFILE LOADING ---
  if (profileLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- STATE 2: NO LOCATION SET ---
  if (!searchParams) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContent}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons
              name="location-outline"
              size={40}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Location Required
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Please set your default location in your profile to start finding
            rides.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- STATE 3: SEARCH FORM (before search) ---
  if (!hasSearched) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.searchForm}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            Find a Ride
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                From
              </Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[styles.inputText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {userProfile?.profile?.defaultAddress ||
                    "Your default location"}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                To
              </Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="school"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.inputText, { color: colors.text }]}>
                  McMaster University
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Date
              </Text>
              <DatePickerComponent
                value={desiredDate || new Date()}
                onChange={(date) => setDesiredDate(date)}
                minimumDate={new Date()}
                backgroundColor={colors.background}
                borderColor={colors.border}
                textColor={colors.text}
                iconColor={colors.primary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Desired Arrival Time
              </Text>
              <TextInput
                style={[
                  styles.timeInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={desiredArrivalTime}
                onChangeText={setDesiredArrivalTime}
                placeholder="HH:MM"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Dummy Matches Toggle */}
            <View style={styles.inputGroup}>
              <View
                style={[
                  styles.toggleContainer,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.toggleLabelContainer}>
                  <Ionicons
                    name="flask-outline"
                    size={18}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    Include Test Matches
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleSwitch,
                    {
                      backgroundColor: includeDummyMatches
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() => {
                    // #region agent log
                    log(
                      "matchmaking.tsx:315",
                      "Toggle clicked",
                      {
                        currentValue: includeDummyMatches,
                        newValue: !includeDummyMatches,
                      },
                      "A"
                    );
                    // #endregion agent log
                    setIncludeDummyMatches(!includeDummyMatches);
                  }}
                >
                  <Animated.View
                    style={[
                      styles.toggleThumb,
                      {
                        transform: [
                          {
                            translateX: toggleAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 22],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
          >
            <Ionicons name="search" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Search for Rides</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- STATE 4: LOADING MATCHES ---
  if (matchesQuery.isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginBottom: 20 }}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Searching...
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Finding your best ride to Campus
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- STATE 5: EMPTY RESULTS ---
  if (!matchesQuery.data || matchesQuery.data.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContent}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons name="car-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No matches found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Try adjusting your time or check back later for new rides.
          </Text>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={() => {
              setHasSearched(false);
              setDesiredDate(null);
              setIncludeDummyMatches(false);
            }}
          >
            <Text
              style={[styles.secondaryButtonText, { color: colors.primary }]}
            >
              New Search
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- STATE 6: SWIPE DECK ---
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Swipe to Match
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {matchesQuery.data.length} rides found
          {desiredDate
            ? ` for ${desiredDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })} at ${desiredArrivalTime}`
            : ` for ${desiredArrivalTime}`}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setHasSearched(false);
            setDesiredDate(null);
            setIncludeDummyMatches(false);
          }}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>
            New Search
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.swipeContainer}>
        <SwipeDeck
          data={matchesQuery.data}
          renderCard={(match) => <TripCard match={match} />}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onCardTap={handleCardTap}
          onDeckEmpty={handleDeckEmpty}
        />
      </View>

      {/* Swipe instructions */}
      <View style={styles.instructionsContainer}>
        <View style={styles.instructionRow}>
          <Ionicons name="close-circle" size={24} color={colors.error} />
          <Text
            style={[styles.instructionText, { color: colors.textSecondary }]}
          >
            Swipe left to pass
          </Text>
        </View>
        <View style={styles.instructionRow}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text
            style={[styles.instructionText, { color: colors.textSecondary }]}
          >
            Swipe right to request
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 15 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 22,
  },

  // Search Form
  searchForm: { padding: 24 },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  inputText: { fontSize: 15, flex: 1 },
  timeInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 20,
  },
  secondaryButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },

  // Swipe container
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
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  toggleLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    transform: [{ translateX: 0 }],
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
});
