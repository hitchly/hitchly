import Ionicons from "@expo/vector-icons/Ionicons";
import type {
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpdateVehicleInput,
} from "@hitchly/db/validators/profile";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PreferencesForm,
  ProfileForm,
  VehicleForm,
} from "../../components/profile/profile-forms";
import { Card, InfoCard, InfoRow } from "../../components/ui/card";
import { Chip, LoadingSkeleton } from "../../components/ui/display";
import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";

type ModalState =
  | { type: "profile"; initialData: UpdateProfileInput }
  | { type: "preferences"; initialData: UpdatePreferencesInput }
  | { type: "vehicle"; initialData: UpdateVehicleInput }
  | null;

// Helper to format coordinates (e.g., 43.26 N, 79.92 W)
const formatCoord = (val: number, type: "lat" | "long") => {
  const dir = type === "lat" ? (val > 0 ? "N" : "S") : val > 0 ? "E" : "W";
  return `${Math.abs(val).toFixed(4)}° ${dir}`;
};

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();
  const theme = useTheme();

  // 1. Fetch Data
  const {
    data: userRecord,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.profile.getMe.useQuery();

  const [modalState, setModalState] = useState<ModalState>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // --- New Location State ---
  const [locationInfo, setLocationInfo] = useState<{
    address: string;
    coords: string;
  } | null>(null);

  // 2. Handlers
  const handleCloseModal = () => setModalState(null);

  // Refresh both Profile data AND Location
  const handleRefresh = async () => {
    await Promise.all([refetch(), fetchLocation()]);
  };

  const onSuccess = () => {
    utils.profile.getMe.invalidate();
    handleCloseModal();
    Alert.alert("Success", "Profile updated successfully.");
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut({
      fetchOptions: { onSuccess: () => console.log("Signed out") },
    });
  };

  // --- Location Fetcher ---
  const fetchLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});

      // Reverse Geocode to get readable address
      const reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const place = reverse[0];
      // Construct readable string: "City, Region" or "Street, City"
      const parts = [place?.street, place?.city, place?.region].filter(Boolean);

      const address = parts.length > 0 ? parts.join(", ") : "Unknown Address";
      const coords = `${formatCoord(loc.coords.latitude, "lat")}, ${formatCoord(
        loc.coords.longitude,
        "long"
      )}`;

      setLocationInfo({ address, coords });
    } catch (e) {
      console.log("Failed to fetch location for profile", e);
    }
  };

  // Fetch location on mount
  useEffect(() => {
    fetchLocation();
  }, []);

  // 3. Modal Openers
  const openProfileModal = () => {
    setModalState({
      type: "profile",
      initialData: {
        bio: userRecord?.profile?.bio ?? "",
        faculty: userRecord?.profile?.faculty ?? "",
        year: userRecord?.profile?.year ?? 1,
        appRole: userRecord?.profile?.appRole ?? "rider",
        universityRole: userRecord?.profile?.universityRole ?? "student",
      },
    });
  };

  const openPreferencesModal = () => {
    setModalState({
      type: "preferences",
      initialData: {
        music: userRecord?.preferences?.music ?? true,
        chatty: userRecord?.preferences?.chatty ?? true,
        pets: userRecord?.preferences?.pets ?? false,
        smoking: userRecord?.preferences?.smoking ?? false,
      },
    });
  };

  const openVehicleModal = () => {
    setModalState({
      type: "vehicle",
      initialData: {
        make: userRecord?.vehicle?.make ?? "",
        model: userRecord?.vehicle?.model ?? "",
        color: userRecord?.vehicle?.color ?? "",
        plate: userRecord?.vehicle?.plate ?? "",
        seats: userRecord?.vehicle?.seats ?? 4,
      },
    });
  };

  // 4. Derived State
  const initials = session?.user?.name?.slice(0, 2).toUpperCase() || "??";
  const isDriver = ["driver", "both"].includes(
    userRecord?.profile?.appRole || ""
  );

  if (isLoading) return <LoadingSkeleton text="Loading Profile..." />;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <Card style={{ alignItems: "center" }}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.primary, borderColor: theme.surface },
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: theme.text }]}>
            {session?.user?.name}
          </Text>
          <Text style={[styles.email, { color: theme.textSecondary }]}>
            {session?.user?.email}
          </Text>

          <View
            style={[
              styles.badge,
              session?.user?.emailVerified
                ? {
                    backgroundColor: theme.successBackground,
                    borderColor: theme.success,
                  }
                : {
                    backgroundColor: theme.warningBackground,
                    borderColor: theme.warning,
                  },
            ]}
          >
            <Ionicons
              name={
                session?.user?.emailVerified
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={16}
              color={
                session?.user?.emailVerified ? theme.success : theme.warning
              }
            />
            <Text
              style={[
                styles.badgeText,
                {
                  color: session?.user?.emailVerified
                    ? theme.success
                    : theme.warning,
                },
              ]}
            >
              {session?.user?.emailVerified ? "Verified" : "Not Verified"}
            </Text>
          </View>
        </Card>

        {/* --- NEW LOCATION CARD --- */}
        <InfoCard
          title="Current Location"
          empty={!locationInfo}
          emptyText="Location unavailable"
        >
          {locationInfo && (
            <View style={styles.locationContainer}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: theme.primaryLight },
                ]}
              >
                <Ionicons name="location" size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationAddress, { color: theme.text }]}>
                  {locationInfo.address}
                </Text>
                <Text
                  style={[
                    styles.locationCoords,
                    { color: theme.textSecondary },
                  ]}
                >
                  {locationInfo.coords}
                </Text>
              </View>
            </View>
          )}
        </InfoCard>

        <InfoCard
          title="About Me"
          onEdit={openProfileModal}
          empty={!userRecord?.profile}
          emptyText="Complete your profile to start riding."
        >
          {userRecord?.profile && (
            <View style={{ gap: 16 }}>
              <InfoRow
                label="Bio"
                value={userRecord.profile.bio || "No bio set"}
                fullWidth
              />
              <View style={styles.row}>
                <InfoRow
                  label="Faculty"
                  value={userRecord.profile.faculty || "-"}
                />
                <InfoRow
                  label="Year"
                  value={userRecord.profile.year?.toString() || "-"}
                />
              </View>
              <View style={styles.row}>
                <InfoRow
                  label="University Role"
                  value={userRecord.profile.universityRole}
                  capitalize
                />
                <InfoRow
                  label="App Role"
                  value={userRecord.profile.appRole}
                  capitalize
                />
              </View>
            </View>
          )}
        </InfoCard>

        <InfoCard
          title="Ride Preferences"
          onEdit={openPreferencesModal}
          empty={!userRecord?.preferences}
          emptyText="Set your ride comfort settings."
        >
          {userRecord?.preferences && (
            <View style={styles.chipContainer}>
              <Chip
                icon="musical-notes"
                label="Music"
                active={userRecord.preferences.music}
              />
              <Chip
                icon="chatbubbles"
                label="Chatty"
                active={userRecord.preferences.chatty}
              />
              <Chip
                icon="paw"
                label="Pets"
                active={userRecord.preferences.pets}
              />
              <Chip
                icon="flame"
                label="Smoking"
                active={userRecord.preferences.smoking}
              />
            </View>
          )}
        </InfoCard>

        {isDriver && (
          <InfoCard
            title="Vehicle Details"
            onEdit={openVehicleModal}
            empty={!userRecord?.vehicle}
            emptyText="Add your vehicle to start driving."
            actionLabel="Add Vehicle"
          >
            {userRecord?.vehicle && (
              <View style={styles.vehicleRow}>
                <View
                  style={[
                    styles.vehicleIcon,
                    { backgroundColor: theme.primaryLight },
                  ]}
                >
                  <Ionicons name="car-sport" size={24} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vehicleName, { color: theme.text }]}>
                    {userRecord.vehicle.color} {userRecord.vehicle.make}{" "}
                    {userRecord.vehicle.model}
                  </Text>
                  <Text
                    style={[
                      styles.vehiclePlate,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {userRecord.vehicle.plate}
                  </Text>
                </View>
                <View
                  style={[
                    styles.seatBadge,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <Text
                    style={[styles.seatText, { color: theme.textSecondary }]}
                  >
                    {userRecord.vehicle.seats} Seats
                  </Text>
                </View>
              </View>
            )}
          </InfoCard>
        )}

        <TouchableOpacity
          style={[
            styles.signOutBtn,
            { borderColor: theme.error, backgroundColor: theme.surface },
          ]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color={theme.error} />
          ) : (
            <Text style={[styles.signOutText, { color: theme.error }]}>
              Sign Out
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={!!modalState}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {modalState?.type === "profile" && "Edit Profile"}
                {modalState?.type === "preferences" && "Edit Preferences"}
                {modalState?.type === "vehicle" && "Edit Vehicle"}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {modalState?.type === "profile" && (
                <ProfileForm
                  initialData={modalState.initialData}
                  onSuccess={onSuccess}
                />
              )}
              {modalState?.type === "preferences" && (
                <PreferencesForm
                  initialData={modalState.initialData}
                  onSuccess={onSuccess}
                />
              )}
              {modalState?.type === "vehicle" && (
                <VehicleForm
                  initialData={modalState.initialData}
                  onSuccess={onSuccess}
                />
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles (Structural only, Colors moved to Theme) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  avatarText: { fontSize: 32, fontWeight: "bold", color: "#fff" },
  name: { fontSize: 24, fontWeight: "800" },
  email: { fontSize: 14, marginBottom: 8 },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  badgeText: { fontSize: 13, fontWeight: "600" },

  // Containers
  row: { flexDirection: "row", justifyContent: "space-between" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  // NEW: Location Styling
  locationContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  locationAddress: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  locationCoords: {
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Vehicle Specifics
  vehicleRow: { flexDirection: "row", alignItems: "center" },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vehicleName: { fontSize: 16, fontWeight: "700" },
  vehiclePlate: {
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
  },
  seatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seatText: { fontSize: 12, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },

  // Sign Out
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
  },
  signOutText: { fontSize: 16, fontWeight: "600" },
});
