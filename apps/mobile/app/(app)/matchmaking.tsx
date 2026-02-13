import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import type { ErrorInfo, ReactNode } from "react";
import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SwipeDeck, TripCard, type RideMatch } from "../../components/swipe";
import { DatePickerComponent } from "../../components/ui/date-picker";
import { useTheme } from "../../context/theme-context";
import { isTestAccount } from "../../lib/test-accounts";
import { trpc } from "../../lib/trpc";

// McMaster University coordinates (default destination)
const MCMASTER_COORDS = { lat: 43.2609, lng: -79.9192 };

// Error Boundary for SwipeDeck
class ErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SwipeDeck Error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 10,
              color: "#FF3B30",
            }}
          >
            Swipe Error
          </Text>
          <Text
            style={{
              fontSize: 14,
              textAlign: "center",
              marginBottom: 20,
              color: "#666",
            }}
          >
            {this.state.error?.message || "An error occurred"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset?.();
            }}
            style={{
              backgroundColor: "#007AFF",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function Matchmaking() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: userProfile, isLoading: profileLoading } =
    trpc.profile.getMe.useQuery();
  const userEmail = userProfile?.email;
  const isTestUser = isTestAccount(userEmail);
  const [desiredArrivalTime, setDesiredArrivalTime] = useState("09:00");
  const [desiredDate, setDesiredDate] = useState<Date | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [includeDummyMatches, setIncludeDummyMatches] = useState(false);
  const [direction, setDirection] = useState<"toMcmaster" | "fromMcmaster">(
    "toMcmaster"
  );
  const [swipedCardIds, setSwipedCardIds] = useState<Set<string>>(new Set());
  const [swipedCardsLoaded, setSwipedCardsLoaded] = useState(false);
  const toggleAnim = useRef(new Animated.Value(0)).current;

  // Load swiped cards from storage on mount - MUST complete before filtering
  useEffect(() => {
    const loadSwipedCards = async () => {
      try {
        const stored = await AsyncStorage.getItem("swipedCardIds");
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          const loadedSet = new Set(ids);
          setSwipedCardIds(loadedSet);
        }
        setSwipedCardsLoaded(true);
      } catch (error) {
        console.error("Error loading swiped cards:", error);
        setSwipedCardsLoaded(true); // Still mark as loaded even on error
      }
    };
    loadSwipedCards();
  }, []);

  // Save swiped cards to storage whenever they change
  useEffect(() => {
    const saveSwipedCards = async () => {
      try {
        const ids = Array.from(swipedCardIds);
        if (ids.length > 0) {
          await AsyncStorage.setItem("swipedCardIds", JSON.stringify(ids));
        } else {
          // Clear storage if no swiped cards
          await AsyncStorage.removeItem("swipedCardIds");
        }
      } catch (error) {
        console.error("Error saving swiped cards:", error);
      }
    };
    // Always save (even if empty) to ensure storage is in sync
    saveSwipedCards();
  }, [swipedCardIds]);

  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: includeDummyMatches ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [includeDummyMatches, toggleAnim]);

  // User profile already loaded above

  // Build search params from user's profile - useMemo to stabilize object reference
  const searchParams = useMemo(() => {
    if (
      !userProfile?.profile?.defaultLat ||
      !userProfile?.profile?.defaultLong
    ) {
      return null;
    }

    const homeCoords = {
      lat: userProfile.profile.defaultLat,
      lng: userProfile.profile.defaultLong,
    };

    // Swap origin/destination based on direction
    const origin = direction === "toMcmaster" ? homeCoords : MCMASTER_COORDS;
    const destination =
      direction === "toMcmaster" ? MCMASTER_COORDS : homeCoords;

    return {
      origin,
      destination,
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
    direction,
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

  // Filter out swiped cards - use useMemo to ensure stable reference
  // MUST be called before any early returns to follow Rules of Hooks
  // IMPORTANT: Only filter after swiped cards are loaded from storage
  const filteredMatches = useMemo(() => {
    if (!matchesQuery.data) {
      return [];
    }

    // Wait for swiped cards to load before filtering
    if (!swipedCardsLoaded) {
      return matchesQuery.data; // Return all matches until swiped cards are loaded
    }

    const allMatchIds = matchesQuery.data.map((m) => m.rideId);
    const filtered = matchesQuery.data.filter((match) => {
      const isSwiped = swipedCardIds.has(match.rideId);
      return !isSwiped;
    });
    return filtered;
  }, [matchesQuery.data, swipedCardIds, swipedCardsLoaded]);

  const utils = trpc.useUtils();

  const requestRideMutation = trpc.trip.createTripRequest.useMutation({
    onSuccess: () => {
      // Invalidate requests query so "My Requests" tab updates immediately
      utils.trip.getTripRequests.invalidate();
    },
    onError: (error: any) => {
      console.error("Request ride mutation error:", error);
      // Keep error alert for debugging
      setTimeout(() => {
        Alert.alert("Error", "Could not send request: " + error.message);
      }, 500);
    },
  });

  const handleSwipeRight = (match: RideMatch) => {
    // Track that this card was swiped right (requested)
    if (match?.rideId) {
      setSwipedCardIds((prev) => {
        const newSet = new Set(prev).add(match.rideId);
        // Immediately save to storage to ensure persistence
        AsyncStorage.setItem(
          "swipedCardIds",
          JSON.stringify(Array.from(newSet))
        ).catch((err) => {
          console.error("Error saving swiped card immediately:", err);
        });
        return newSet;
      });
    }

    // Store match data in case component unmounts
    const matchData = { ...match };
    const searchParamsData = searchParams ? { ...searchParams } : null;

    // Use InteractionManager to defer the mutation until all interactions/animations complete
    const handle = InteractionManager.runAfterInteractions(() => {
      try {
        // Use matchmaking.requestRide (uses rideId from rides table)
        // Pickup location is the rider's origin (where they want to be picked up)
        if (!searchParamsData) {
          // Defer alert to avoid conflicts
          setTimeout(() => {
            Alert.alert("Error", "Search parameters not available");
          }, 100);
          return;
        }
        if (!matchData?.rideId) {
          setTimeout(() => {
            Alert.alert("Error", "Invalid match data");
          }, 100);
          return;
        }
        requestRideMutation.mutate({
          tripId: matchData.rideId,
          pickupLat: searchParamsData.origin.lat,
          pickupLng: searchParamsData.origin.lng,
          // Pass fare estimation from matchmaking for consistent pricing
          estimatedDistanceKm: matchData.details?.estimatedDistanceKm,
          estimatedDurationSec: matchData.details?.estimatedDurationSec,
          estimatedDetourSec: (matchData.details?.detourMinutes ?? 0) * 60,
        });
      } catch (error) {
        console.error("Error in handleSwipeRight:", error);
        setTimeout(() => {
          Alert.alert("Error", "Failed to send ride request");
        }, 100);
      }
    });

    // Return cancellation function in case component unmounts
    return () => {
      handle.cancel();
    };
  };

  const handleSwipeLeft = (match: RideMatch) => {
    // Track that this card was swiped left (dismissed)
    if (match?.rideId) {
      setSwipedCardIds((prev) => {
        const newSet = new Set(prev).add(match.rideId);
        // Immediately save to storage to ensure persistence
        AsyncStorage.setItem(
          "swipedCardIds",
          JSON.stringify(Array.from(newSet))
        ).catch((err) => {
          console.error("Error saving swiped card immediately:", err);
        });
        return newSet;
      });
    }
  };

  const handleCardTap = (match: RideMatch) => {
    // Navigate to trip details
    router.push(`/(app)/trips/${match.rideId}` as any);
  };

  const handleDeckEmpty = () => {
    // Alert removed per user request
    // Deck empty - no action needed
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
    // Don't clear swiped cards - keep them tracked across searches
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
            {/* Direction Selector */}
            <View style={styles.inputGroup}>
              <View style={styles.directionHeader}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Direction
                </Text>
                <TouchableOpacity
                  style={[
                    styles.swapButton,
                    { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => {
                    setDirection(
                      direction === "toMcmaster" ? "fromMcmaster" : "toMcmaster"
                    );
                  }}
                >
                  <Ionicons
                    name="swap-vertical"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.directionSelector,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* From */}
                <View style={styles.directionRow}>
                  <View
                    style={[
                      styles.directionDot,
                      { backgroundColor: colors.success },
                    ]}
                  />
                  <View style={styles.directionInfo}>
                    <Text
                      style={[
                        styles.directionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      From
                    </Text>
                    <View style={styles.directionLocationRow}>
                      <Ionicons
                        name={
                          direction === "toMcmaster" ? "location" : "school"
                        }
                        size={18}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.directionText, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {direction === "toMcmaster"
                          ? userProfile?.profile?.defaultAddress ||
                            "Your home address"
                          : "McMaster University"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Vertical line connector */}
                <View style={styles.directionConnector}>
                  <View
                    style={[
                      styles.connectorLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                </View>

                {/* To */}
                <View style={styles.directionRow}>
                  <View
                    style={[
                      styles.directionDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                  <View style={styles.directionInfo}>
                    <Text
                      style={[
                        styles.directionLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      To
                    </Text>
                    <View style={styles.directionLocationRow}>
                      <Ionicons
                        name={
                          direction === "toMcmaster" ? "school" : "location"
                        }
                        size={18}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.directionText, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {direction === "toMcmaster"
                          ? "McMaster University"
                          : userProfile?.profile?.defaultAddress ||
                            "Your home address"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Date
              </Text>
              <DatePickerComponent
                value={desiredDate || new Date()}
                onChange={(date) => {
                  setDesiredDate(date);
                }}
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
            {isTestUser && (
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
            )}
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
  if (!matchesQuery.data || filteredMatches.length === 0) {
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
            onPress={async () => {
              setHasSearched(false);
              setDesiredDate(null);
              setIncludeDummyMatches(false);
              setSwipedCardIds(new Set()); // Clear swiped cards for new search
              // Also clear from storage
              try {
                await AsyncStorage.removeItem("swipedCardIds");
              } catch (error) {
                console.error(
                  "Error clearing swiped cards from storage:",
                  error
                );
              }
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
          {filteredMatches.length} rides found
          {desiredDate
            ? ` for ${desiredDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })} at ${desiredArrivalTime}`
            : ` for ${desiredArrivalTime}`}
        </Text>
        <TouchableOpacity
          onPress={async () => {
            setHasSearched(false);
            setDesiredDate(null);
            setIncludeDummyMatches(false);
            setSwipedCardIds(new Set()); // Clear swiped cards for new search
            // Also clear from storage
            try {
              await AsyncStorage.removeItem("swipedCardIds");
            } catch (error) {
              console.error("Error clearing swiped cards from storage:", error);
            }
          }}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>
            New Search
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.swipeContainer}>
        <ErrorBoundary
          onReset={() => {
            setHasSearched(false);
          }}
        >
          <SwipeDeck
            data={filteredMatches}
            renderCard={(match) => <TripCard match={match} />}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onCardTap={handleCardTap}
            onDeckEmpty={handleDeckEmpty}
          />
        </ErrorBoundary>
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

  // Direction selector
  directionSelector: {
    flexDirection: "column",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  directionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  directionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  directionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  directionInfo: {
    flex: 1,
  },
  directionLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  directionLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  directionConnector: {
    paddingLeft: 5,
    paddingVertical: 2,
  },
  connectorLine: {
    width: 2,
    height: 16,
    marginLeft: 0,
  },
  directionText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    lineHeight: 20,
  },
  swapButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
