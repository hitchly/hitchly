import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/card";
import { SafetyContacts } from "../../constants/safety";
import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";

export default function SafetyScreen() {
  const { colors, fonts } = useTheme();
  const router = useRouter();
  const { mode, tripId } = useLocalSearchParams<{
    mode?: "emergency" | "report";
    tripId?: string;
  }>();
  const { data: session } = authClient.useSession();
  const scrollRef = useRef<ScrollView | null>(null);
  const highlightKeyRef = useRef<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    tripId ?? null
  );
  const [emergencySectionY, setEmergencySectionY] = useState<number | null>(
    null
  );
  const [reportSectionY, setReportSectionY] = useState<number | null>(null);
  const [highlightSection, setHighlightSection] = useState<
    "emergency" | "report" | null
  >(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [reason, setReason] = useState("");

  const createComplaint = trpc.complaints.createComplaint.useMutation({
    onSuccess: () => {
      setReason("");
      Alert.alert("Submitted", "Your concern has been noted. Our safety team will review it and follow up.");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const canSubmitReport =
    targetUserId.trim().length > 0 && reason.trim().length > 0;

  const effectiveTripId = selectedTripId ?? tripId ?? null;

  const { data: trips } = trpc.trip.getTrips.useQuery();

  const { data: trip, isLoading: isTripLoading } =
    trpc.trip.getTripById.useQuery(
    { tripId: effectiveTripId ?? "" },
    { enabled: !!effectiveTripId }
  );

  const reportedUserLabel = useMemo(() => {
    if (!effectiveTripId) {
      return "Select a trip to auto-fill";
    }

    if (!targetUserId) {
      return isTripLoading
        ? "Loading reported user..."
        : "Unable to resolve reported user";
    }

    const currentUserId = session?.user?.id;
    if (!trip || !currentUserId) {
      return targetUserId;
    }

    if (trip.driverId && trip.driverId !== currentUserId) {
      if (trip.driver) {
        const name = trip.driver.name || "Driver";
        const contact = trip.driver.email || trip.driver.id;
        return `${name} (${contact})`;
      }
      return `Driver: ${targetUserId}`;
    }

    const matchedRequest = Array.isArray(trip.requests)
      ? trip.requests.find((req) => req.riderId === targetUserId)
      : undefined;
    if (matchedRequest?.rider) {
      const name = matchedRequest.rider.name || "Rider";
      const contact = matchedRequest.rider.email || matchedRequest.rider.id;
      return `${name} (${contact})`;
    }

    return targetUserId;
  }, [effectiveTripId, isTripLoading, session?.user?.id, targetUserId, trip]);

  useEffect(() => {
    if (!trip || !session?.user?.id) return;
    if (targetUserId.trim().length > 0) return;

    const currentUserId = session.user.id;
    if (trip.driverId && trip.driverId !== currentUserId) {
      setTargetUserId(trip.driverId);
      return;
    }

    if (trip.driverId === currentUserId && Array.isArray(trip.requests)) {
      const preferredRequest =
        trip.requests.find(
          (req) => req.status === "accepted" || req.status === "on_trip"
        ) ?? trip.requests[0];
      if (preferredRequest?.riderId) {
        setTargetUserId(preferredRequest.riderId);
      }
    }
  }, [session?.user?.id, targetUserId, trip]);

  useEffect(() => {
    if (!mode) {
      highlightKeyRef.current = null;
      return;
    }

    const targetY = mode === "emergency" ? emergencySectionY : reportSectionY;
    if (targetY === null) return;

    const highlightKey = `${mode}:${effectiveTripId ?? "none"}`;
    if (highlightKeyRef.current === highlightKey) return;

    highlightKeyRef.current = highlightKey;
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
    setHighlightSection(mode);
  }, [emergencySectionY, reportSectionY, mode, effectiveTripId]);

  useEffect(() => {
    if (!highlightSection) return;
    const timeoutId = setTimeout(() => {
      setHighlightSection(null);
    }, 700);
    return () => clearTimeout(timeoutId);
  }, [highlightSection]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>
              Back
            </Text>
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color={colors.text} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Safety
            </Text>
          </View>
          <View style={styles.backButton} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Safety & Reporting
        </Text>
        {effectiveTripId ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Trip ID: {effectiveTripId}
          </Text>
        ) : null}
        {!effectiveTripId && trips && trips.length > 0 && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Select a Trip
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Choose a trip to auto-fill the reported user.
            </Text>
            {trips.map((tripItem) => (
              <TouchableOpacity
                key={tripItem.id}
                style={[
                  styles.tripRow,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                  selectedTripId === tripItem.id
                    ? { borderColor: colors.primary }
                    : null,
                ]}
                onPress={() => {
                  setTargetUserId("");
                  setSelectedTripId(tripItem.id);
                }}
              >
                <Text style={[styles.tripTitle, { color: colors.text }]}>
                  {tripItem.origin} → {tripItem.destination}
                </Text>
                <Text
                  style={[styles.tripSubtext, { color: colors.textSecondary }]}
                >
                  {new Date(tripItem.departureTime).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {!effectiveTripId && trips && trips.length === 0 && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Select a Trip
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              No trips found yet. Open Safety from a trip to auto-fill.
            </Text>
          </Card>
        )}

        <View
          onLayout={(event) => {
            setEmergencySectionY(event.nativeEvent.layout.y);
          }}
        >
          <Card
            style={
              highlightSection === "emergency"
                ? [styles.highlightCardActive, { borderColor: colors.primary }]
                : undefined
            }
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Contact Hitchly Safety Team
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              For immediate assistance, please use these to contact our safety team.
            </Text>

            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, fontFamily: fonts.bold },
              ]}
            >
              Emergency Phone
            </Text>
            <Text style={[styles.contactValue, { color: colors.text }]}>
              {SafetyContacts.phone}
            </Text>

            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, fontFamily: fonts.bold },
              ]}
            >
              Emergency Email
            </Text>
            <Text style={[styles.contactValue, { color: colors.text }]}>
              {SafetyContacts.email}
            </Text>
          </Card>
        </View>

        {/* Report Form */}
        <View
          onLayout={(event) => {
            setReportSectionY(event.nativeEvent.layout.y);
          }}
        >
          <Card
            style={
              highlightSection === "report"
                ? [styles.highlightCardActive, { borderColor: colors.primary }]
                : undefined
            }
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Report an Issue
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Tell us what we can help you with.
            </Text>

            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, fontFamily: fonts.bold },
              ]}
            >
              Reported User
            </Text>
            <Text style={[styles.contactValue, { color: colors.text }]}>
              {reportedUserLabel}
            </Text>

            <Text
              style={[
                styles.label,
                { color: colors.textSecondary, fontFamily: fonts.bold },
              ]}
            >
              Details
            </Text>
            <TextInput
              placeholder="Describe the issue in detail..."
            value={reason}
            onChangeText={setReason}
            style={[
              styles.textArea,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
                fontFamily: fonts.regular,
              },
            ]}
            multiline
            placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                !canSubmitReport || createComplaint.isPending
                  ? styles.primaryButtonDisabled
                  : null,
              ]}
              disabled={!canSubmitReport || createComplaint.isPending}
              onPress={() => {
                if (!canSubmitReport) return;
                createComplaint.mutate({
                  targetUserId: targetUserId.trim(),
                  content: reason.trim(),
                  rideId: effectiveTripId ?? undefined,
                });
              }}
            >
              <Text style={styles.primaryButtonText}>
                {createComplaint.isPending ? "Submitting..." : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backButton: {
    width: 64,
    height: 32,
    justifyContent: "center",
  },
  backButtonText: { fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4, paddingHorizontal: 16 },
  subtitle: { marginBottom: 8, paddingHorizontal: 16 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  cardSubtitle: { marginTop: 6, marginBottom: 12 },
  label: {
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  contactValue: { fontSize: 15, fontWeight: "600", marginBottom: 12 },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  primaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    opacity: 0.6,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  modeHint: { marginTop: 12, paddingHorizontal: 16, fontWeight: "600" },
  tripRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  tripTitle: { fontSize: 15, fontWeight: "600" },
  tripSubtext: { marginTop: 4, fontSize: 12 },
  highlightCardActive: {
    borderWidth: 2,
    borderRadius: 16,
  },
});
