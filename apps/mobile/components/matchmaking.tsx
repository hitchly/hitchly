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
} from "react-native";
import { trpc } from "@/lib/trpc";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// --- HELPER COMPONENTS (Fixes TypeScript Errors) ---

// 1. Define a ThemedText that accepts the "type" prop
interface ThemedTextProps extends TextProps {
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
}

const ThemedText = ({ style, type, ...rest }: ThemedTextProps) => {
  // Apply styles based on the "type" prop so you keep the bold/size looks
  const baseStyle =
    type === "title"
      ? { fontSize: 24, fontWeight: "bold" as const, lineHeight: 32 }
      : type === "subtitle"
        ? { fontSize: 20, fontWeight: "bold" as const }
        : type === "defaultSemiBold"
          ? { fontSize: 16, fontWeight: "600" as const }
          : { fontSize: 16 };

  return <Text style={[baseStyle, style]} {...rest} />;
};

// 2. ThemedView can just be a standard View
const ThemedView = View;

const COLORS = {
  primary: "#16a34a",
  primaryLight: "#dcfce7",
  textDark: "#333333",
  textMedium: "#666666",
  textLight: "#999999",
  background: "#ffffff",
  border: "#f0f0f0",
  cardBg: "#ffffff",
  shadow: "#000000",
};

const TEST_RIDER_PROFILE = {
  id: "rider-1",
  city: "Hamilton (Westdale)",
  origin: { lat: 43.255, lng: -79.9 },
  destination: { lat: 43.2609, lng: -79.9192 },
  desiredArrivalTime: "08:45",
  maxOccupancy: 3,
  preference: "costPriority" as const,
};

export default function Matchmaking() {
  const [minLoadingTimePassed, setMinLoadingTimePassed] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  const matchesQuery =
    trpc.matchmaking.findMatches.useQuery(TEST_RIDER_PROFILE);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingTimePassed(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleRequestRide = () => {
    if (!selectedMatch) return;
    requestMutation.mutate({
      rideId: `ride_${selectedMatch.driverId}`,
      riderId: TEST_RIDER_PROFILE.id,
      seatsRequested: 1,
    });
  };

  // --- STATE 1: LOADING ---
  if (!minLoadingTimePassed || matchesQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginBottom: 20 }}
          />
          <ThemedText type="title" style={styles.loadingTitle}>
            Connecting...
          </ThemedText>
          <ThemedText style={styles.loadingSubtitle}>
            Finding your best ride to Campus
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // --- STATE 2: EMPTY ---
  if (!matchesQuery.data || matchesQuery.data.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons
            name="car-outline"
            size={64}
            color={COLORS.textLight}
            style={{ marginBottom: 20 }}
          />
          <ThemedText type="title" style={{ color: COLORS.textDark }}>
            No matches found
          </ThemedText>
          <ThemedText style={{ marginTop: 10, color: COLORS.textMedium }}>
            Try adjusting your time or pickup location.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // --- STATE 3: RESULTS LIST ---
  return (
    <SafeAreaView style={styles.container}>
      {/* Replaced ThemedView with View here */}
      <View style={styles.header}>
        <ThemedText type="subtitle" style={{ color: COLORS.textDark }}>
          Select a Ride
        </ThemedText>
        <ThemedText style={{ color: COLORS.textMedium }}>
          Options for {TEST_RIDER_PROFILE.desiredArrivalTime}
        </ThemedText>
      </View>

      <FlatList
        data={matchesQuery.data}
        keyExtractor={(item) => item.driverId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => setSelectedMatch(item)}
          >
            {/* Replaced ThemedView with View here */}
            <View style={styles.cardHeader}>
              <View>
                <ThemedText type="defaultSemiBold" style={styles.driverName}>
                  {item.driver.name}
                </ThemedText>
                <ThemedText style={styles.detailsText}>
                  {item.driver.vehicle}
                </ThemedText>
              </View>

              <ThemedText type="title" style={styles.price}>
                ${item.details.estimatedCost.toFixed(2)}
              </ThemedText>
            </View>

            {/* Replaced ThemedView with View here */}
            <View style={styles.cardFooter}>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>
                  {item.matchPercentage}% Match
                </ThemedText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textLight}
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
          {/* Main Modal Background */}
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeHandleArea}
              onPress={() => setSelectedMatch(null)}
            >
              <View style={styles.dragHandle} />
            </TouchableOpacity>

            {selectedMatch && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {/* Replaced ThemedView with View here */}
                <View style={styles.profileHeader}>
                  <Image
                    source={{ uri: selectedMatch.driver.profilePic }}
                    style={styles.profileImage}
                  />
                  <ThemedText type="title" style={{ color: COLORS.textDark }}>
                    {selectedMatch.driver.name}
                  </ThemedText>
                  <ThemedText style={styles.programText}>
                    {selectedMatch.driver.program}
                  </ThemedText>

                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color={COLORS.textDark} />
                    <ThemedText style={styles.ratingText}>
                      {selectedMatch.driver.rating}
                    </ThemedText>
                  </View>
                </View>

                {/* Replaced ThemedView with View here */}
                <View style={styles.statsContainer}>
                  <View style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Price</ThemedText>
                    <ThemedText style={styles.statValue}>
                      ${selectedMatch.details.estimatedCost.toFixed(2)}
                    </ThemedText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Arrival</ThemedText>
                    <ThemedText style={styles.statValue}>
                      {selectedMatch.driver.plannedArrivalTime}
                    </ThemedText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <ThemedText style={styles.statLabel}>Match</ThemedText>
                    <ThemedText
                      style={[styles.statValue, { color: COLORS.primary }]}
                    >
                      {selectedMatch.matchPercentage}%
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.section}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Vehicle
                  </ThemedText>
                  <ThemedText style={styles.sectionBody}>
                    {selectedMatch.driver.vehicle}
                  </ThemedText>
                </View>

                <View style={styles.section}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    About
                  </ThemedText>
                  <ThemedText style={styles.sectionBody}>
                    {selectedMatch.driver.bio}
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleRequestRide}
                >
                  <ThemedText style={styles.buttonText}>
                    Request Ride
                  </ThemedText>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ... (Styles remain exactly the same as before)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingTitle: {
    textAlign: "center",
    marginBottom: 10,
    color: COLORS.textDark,
  },
  loadingSubtitle: { textAlign: "center", color: COLORS.textMedium },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  listContent: { padding: 20 },

  // --- CLEAN CARD STYLES ---
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    // Subtle shadow
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  driverName: { fontSize: 16, color: COLORS.textDark, marginBottom: 2 },
  detailsText: { fontSize: 14, color: COLORS.textMedium },
  price: { fontSize: 18, fontWeight: "700", color: COLORS.textDark },

  // Green Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
  },
  badgeText: {
    fontWeight: "600",
    fontSize: 12,
    color: COLORS.primary,
  },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  closeHandleArea: {
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },

  profileHeader: { alignItems: "center", marginBottom: 24 },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
    backgroundColor: COLORS.border,
  },
  programText: { color: COLORS.textMedium, fontSize: 14, marginBottom: 8 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: "600",
    fontSize: 12,
    color: COLORS.textDark,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statBox: { alignItems: "center", flex: 1 },
  statDivider: { width: 1, backgroundColor: "#E5E5E5" },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: COLORS.textDark },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 8,
    fontWeight: "600",
  },
  sectionBody: { fontSize: 15, color: COLORS.textMedium, lineHeight: 22 },

  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { color: "#ffffff", fontWeight: "bold", fontSize: 16 },
});
