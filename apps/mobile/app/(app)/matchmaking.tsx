import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  ScrollView,
  View,
  Text,
  TextProps,
  TextInput,
} from "react-native";
import { trpc } from "@/lib/trpc";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/theme-context";

// McMaster University coordinates (default destination)
const MCMASTER_COORDS = { lat: 43.2609, lng: -79.9192 };

// Type for ride match from API
type RideMatch = {
  rideId: string;
  driverId: string;
  name: string;
  profilePic: string;
  vehicle: string;
  rating: number;
  bio: string;
  matchPercentage: number;
  uiLabel: string;
  details: {
    estimatedCost: number;
    detourMinutes: number;
    arrivalAtPickup: string;
    availableSeats: number;
  };
};

export default function Matchmaking() {
  const { colors, fonts } = useTheme();
  const [selectedMatch, setSelectedMatch] = useState<RideMatch | null>(null);
  const [desiredArrivalTime, setDesiredArrivalTime] = useState("09:00");
  const [hasSearched, setHasSearched] = useState(false);

  // Get user profile with default location
  const { data: userProfile, isLoading: profileLoading } =
    trpc.profile.getMe.useQuery();

  // Build search params from user's profile
  const searchParams =
    userProfile?.profile?.defaultLat && userProfile?.profile?.defaultLong
      ? {
          origin: {
            lat: userProfile.profile.defaultLat,
            lng: userProfile.profile.defaultLong,
          },
          destination: MCMASTER_COORDS,
          desiredArrivalTime,
          maxOccupancy: 1,
          preference: "costPriority" as const,
        }
      : null;

  // Only fetch matches if user has location set and has clicked search
  const matchesQuery = trpc.matchmaking.findMatches.useQuery(searchParams!, {
    enabled: !!searchParams && hasSearched,
  });

  const requestMutation = trpc.matchmaking.requestRide.useMutation({
    onSuccess: () => {
      setSelectedMatch(null);
      Alert.alert(
        "Request Sent",
        "The driver has been notified of your request!"
      );
    },
    onError: (error: any) => {
      Alert.alert("Error", "Could not send request: " + error.message);
    },
  });

  const handleRequestRide = () => {
    if (!selectedMatch || !searchParams) return;
    requestMutation.mutate({
      rideId: selectedMatch.rideId,
      pickupLat: searchParams.origin.lat,
      pickupLng: searchParams.origin.lng,
    });
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
            onPress={() => setHasSearched(false)}
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

  // --- STATE 6: RESULTS LIST ---
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Available Rides
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {matchesQuery.data.length} rides found for {desiredArrivalTime}
        </Text>
        <TouchableOpacity onPress={() => setHasSearched(false)}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            New Search
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={matchesQuery.data}
        keyExtractor={(item) => item.rideId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.rideCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.9}
            onPress={() => setSelectedMatch(item)}
          >
            <View style={styles.rideCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.driverName, { color: colors.text }]}>
                  {item.name}
                </Text>
                <Text
                  style={[styles.vehicleText, { color: colors.textSecondary }]}
                >
                  {item.vehicle}
                </Text>
              </View>
              <Text style={[styles.priceText, { color: colors.text }]}>
                ${item.details.estimatedCost.toFixed(2)}
              </Text>
            </View>

            <View style={styles.rideCardFooter}>
              <View
                style={[
                  styles.matchBadge,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Text
                  style={[styles.matchBadgeText, { color: colors.primary }]}
                >
                  {item.matchPercentage}% Match
                </Text>
              </View>
              <View style={styles.seatsInfo}>
                <Ionicons
                  name="person"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.seatsText, { color: colors.textSecondary }]}
                >
                  {item.details.availableSeats} seats
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        )}
      />

      {/* --- DETAILS MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedMatch}
        onRequestClose={() => setSelectedMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity
              style={styles.closeHandleArea}
              onPress={() => setSelectedMatch(null)}
            >
              <View
                style={[styles.dragHandle, { backgroundColor: colors.border }]}
              />
            </TouchableOpacity>

            {selectedMatch && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <View style={styles.profileHeader}>
                  {selectedMatch.profilePic ? (
                    <Image
                      source={{ uri: selectedMatch.profilePic }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {selectedMatch.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[styles.modalDriverName, { color: colors.text }]}
                  >
                    {selectedMatch.name}
                  </Text>
                  <View
                    style={[
                      styles.ratingBadge,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Ionicons name="star" size={14} color={colors.warning} />
                    <Text style={[styles.ratingText, { color: colors.text }]}>
                      {selectedMatch.rating}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statsContainer,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <View style={styles.statBox}>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Price
                    </Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      ${selectedMatch.details.estimatedCost.toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.statBox}>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Departs
                    </Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {selectedMatch.details.arrivalAtPickup}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View style={styles.statBox}>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Match
                    </Text>
                    <Text style={[styles.statValue, { color: colors.primary }]}>
                      {selectedMatch.matchPercentage}%
                    </Text>
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <Text
                    style={[styles.infoLabel, { color: colors.textSecondary }]}
                  >
                    Vehicle
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {selectedMatch.vehicle}
                  </Text>
                </View>

                <View style={styles.infoSection}>
                  <Text
                    style={[styles.infoLabel, { color: colors.textSecondary }]}
                  >
                    Available Seats
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {selectedMatch.details.availableSeats} seats available
                  </Text>
                </View>

                {selectedMatch.bio && (
                  <View style={styles.infoSection}>
                    <Text
                      style={[
                        styles.infoLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      About
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {selectedMatch.bio}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary, marginTop: 24 },
                  ]}
                  onPress={handleRequestRide}
                >
                  <Text style={styles.primaryButtonText}>Request Ride</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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

  // List
  listContent: { padding: 16 },
  rideCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  rideCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  rideCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  vehicleText: { fontSize: 14 },
  priceText: {
    fontSize: 20,
    fontWeight: "700",
  },
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  matchBadgeText: {
    fontWeight: "600",
    fontSize: 12,
  },
  seatsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  seatsText: { fontSize: 13 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  closeHandleArea: {
    alignItems: "center",
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  profileHeader: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  modalDriverName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontWeight: "600",
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statBox: { alignItems: "center", flex: 1 },
  statDivider: { width: 1 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: "700" },
  infoSection: { marginBottom: 20 },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: { fontSize: 16, lineHeight: 24 },
});
