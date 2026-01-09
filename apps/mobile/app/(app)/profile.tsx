import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  EditModalState,
  EditProfileModal,
} from "../../components/profile/edit-profile-modal";
import { Card, InfoCard, InfoRow } from "../../components/ui/card";
import { Chip, LoadingSkeleton } from "../../components/ui/display";
import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";

// Helper
const formatCoord = (val: number, type: "lat" | "long") => {
  const dir = type === "lat" ? (val > 0 ? "N" : "S") : val > 0 ? "E" : "W";
  return `${Math.abs(val).toFixed(4)}° ${dir}`;
};

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  // 1. Destructure simplified theme
  const { colors, fonts } = useTheme();

  const {
    data: userRecord,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.profile.getMe.useQuery();

  const [modalState, setModalState] = useState<EditModalState>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleCloseModal = () => setModalState(null);

  const onSuccess = () => {
    utils.profile.getMe.invalidate();
    handleCloseModal();
    Alert.alert("Success", "Updated successfully.");
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut({
      fetchOptions: { onSuccess: () => console.log("Signed out") },
    });
  };

  const initials = session?.user?.name?.slice(0, 2).toUpperCase() || "??";
  const isDriver = ["driver", "both"].includes(
    userRecord?.profile?.appRole || ""
  );

  const locationDisplay = userRecord?.profile?.defaultAddress
    ? {
        address: userRecord.profile.defaultAddress,
        coords:
          userRecord.profile.defaultLat && userRecord.profile.defaultLong
            ? `${formatCoord(
                userRecord.profile.defaultLat,
                "lat"
              )}, ${formatCoord(userRecord.profile.defaultLong, "long")}`
            : "Coordinates pending",
      }
    : null;

  if (isLoading) return <LoadingSkeleton text="Loading Profile..." />;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* --- HEADER --- */}
        <Card style={{ alignItems: "center" }}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primary, borderColor: colors.surface },
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>
            {session?.user?.name}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {session?.user?.email}
          </Text>

          <View
            style={[
              styles.badge,
              session?.user?.emailVerified
                ? {
                    backgroundColor: colors.successBackground,
                    borderColor: colors.success,
                  }
                : {
                    backgroundColor: colors.warningBackground,
                    borderColor: colors.warning,
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
                session?.user?.emailVerified ? colors.success : colors.warning
              }
            />
            <Text
              style={[
                styles.badgeText,
                {
                  color: session?.user?.emailVerified
                    ? colors.success
                    : colors.warning,
                },
              ]}
            >
              {session?.user?.emailVerified ? "Verified" : "Not Verified"}
            </Text>
          </View>
        </Card>

        {/* --- ADDRESS --- */}
        <InfoCard
          title="Address"
          onEdit={() =>
            setModalState({
              type: "location",
              initialData: {
                address: userRecord?.profile?.defaultAddress ?? "",
                latitude: userRecord?.profile?.defaultLat ?? 0,
                longitude: userRecord?.profile?.defaultLong ?? 0,
              },
            })
          }
          empty={!locationDisplay}
          emptyText="Set your primary pickup address."
          actionLabel="Edit Address"
        >
          {locationDisplay && (
            <View style={styles.locationContainer}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons name="location" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationAddress, { color: colors.text }]}>
                  {locationDisplay.address}
                </Text>
                <Text
                  style={[
                    styles.locationCoords,
                    { color: colors.textSecondary, fontFamily: fonts.mono },
                  ]}
                >
                  {locationDisplay.coords}
                </Text>
              </View>
            </View>
          )}
        </InfoCard>

        {/* --- PROFILE INFO --- */}
        <InfoCard
          title="About Me"
          onEdit={() =>
            setModalState({
              type: "profile",
              initialData: {
                bio: userRecord?.profile?.bio ?? "",
                faculty: userRecord?.profile?.faculty ?? "",
                year: userRecord?.profile?.year ?? 1,
                appRole: userRecord?.profile?.appRole ?? "rider",
                universityRole:
                  userRecord?.profile?.universityRole ?? "student",
              },
            })
          }
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

        {/* --- PREFERENCES --- */}
        <InfoCard
          title="Ride Preferences"
          onEdit={() =>
            setModalState({
              type: "preferences",
              initialData: {
                music: userRecord?.preferences?.music ?? true,
                chatty: userRecord?.preferences?.chatty ?? true,
                pets: userRecord?.preferences?.pets ?? false,
                smoking: userRecord?.preferences?.smoking ?? false,
              },
            })
          }
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

        {/* --- VEHICLE --- */}
        {isDriver && (
          <InfoCard
            title="Vehicle Details"
            onEdit={() =>
              setModalState({
                type: "vehicle",
                initialData: {
                  make: userRecord?.vehicle?.make ?? "",
                  model: userRecord?.vehicle?.model ?? "",
                  color: userRecord?.vehicle?.color ?? "",
                  plate: userRecord?.vehicle?.plate ?? "",
                  seats: userRecord?.vehicle?.seats ?? 4,
                },
              })
            }
            empty={!userRecord?.vehicle}
            emptyText="Add your vehicle to start driving."
            actionLabel="Add Vehicle"
          >
            {userRecord?.vehicle && (
              <View style={styles.vehicleRow}>
                <View
                  style={[
                    styles.vehicleIcon,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Ionicons name="car-sport" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vehicleName, { color: colors.text }]}>
                    {userRecord.vehicle.color} {userRecord.vehicle.make}{" "}
                    {userRecord.vehicle.model}
                  </Text>
                  <Text
                    style={[
                      styles.vehiclePlate,
                      { color: colors.textSecondary, fontFamily: fonts.mono },
                    ]}
                  >
                    {userRecord.vehicle.plate}
                  </Text>
                </View>
                <View
                  style={[
                    styles.seatBadge,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text
                    style={[styles.seatText, { color: colors.textSecondary }]}
                  >
                    {userRecord.vehicle.seats} Seats
                  </Text>
                </View>
              </View>
            )}
          </InfoCard>
        )}

        {/* --- SIGN OUT --- */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            { borderColor: colors.error, backgroundColor: colors.surface },
          ]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <Text style={[styles.signOutText, { color: colors.error }]}>
              Sign Out
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* --- EXTRACTED EDIT MODAL --- */}
      <EditProfileModal
        state={modalState}
        onClose={handleCloseModal}
        onSuccess={onSuccess}
      />
    </SafeAreaView>
  );
}

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
  row: { flexDirection: "row", justifyContent: "space-between" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  locationContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  locationAddress: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  locationCoords: { fontSize: 13 },
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
  vehiclePlate: { fontSize: 13, marginTop: 2 },
  seatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seatText: { fontSize: 12, fontWeight: "600" },
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
