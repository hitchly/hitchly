import Ionicons from "@expo/vector-icons/Ionicons";
import { formatCoordinatePair } from "@hitchly/utils";
import { useRouter } from "expo-router";
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

import type { EditModalState } from "../../components/profile/edit-profile-modal";
import { EditProfileModal } from "../../components/profile/edit-profile-modal";
import { InfoCard, InfoRow } from "../../components/ui/card";
import { Chip, LoadingSkeleton } from "../../components/ui/display";
import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";

const formatCurrency = (cents?: number | null) => {
  if (cents === null || cents === undefined) return "TBD";
  return `$${(cents / 100).toFixed(2)}`;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();
  const { colors, fonts } = useTheme();

  const {
    data: userRecord,
    isLoading,
    refetch,
    isRefetching,
  } = trpc.profile.getMe.useQuery();

  const { data: ratingData } = trpc.reviews.getUserScore.useQuery(
    { userId: session?.user?.id ?? "" },
    { enabled: !!session?.user?.id }
  );

  const [modalState, setModalState] = useState<EditModalState>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleCloseModal = () => {
    setModalState(null);
  };

  const onSuccess = () => {
    utils.profile.getMe.invalidate();
    handleCloseModal();
    Alert.alert("Success", "Updated successfully.");
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut();
  };

  const initials = session?.user?.name?.slice(0, 2).toUpperCase() || "??";
  const isAdmin = (session?.user as any)?.role === "admin";
  const isDriver = ["driver", "both"].includes(
    userRecord?.profile?.appRole || ""
  );

  const { data: earnings } = trpc.profile.getDriverEarnings.useQuery(
    undefined,
    {
      enabled: isDriver,
    }
  );

  const locationDisplay = userRecord?.profile?.defaultAddress
    ? {
        address: userRecord.profile.defaultAddress,
        coords:
          userRecord.profile.defaultLat && userRecord.profile.defaultLong
            ? formatCoordinatePair(
                userRecord.profile.defaultLat,
                userRecord.profile.defaultLong
              )
            : "Coordinates pending",
      }
    : null;

  if (isLoading) return <LoadingSkeleton text="Loading Profile..." />;
  const getBadgeStyle = () => {
    if (isAdmin) {
      return {
        bg: colors.text,
        text: colors.background,
        icon: "build",
        label: "Super Admin",
      };
    }
    if (session?.user?.emailVerified) {
      return {
        bg: colors.successBackground,
        text: colors.success,
        icon: "shield-checkmark",
        label: "Verified Student",
      };
    }
    return {
      bg: colors.warningBackground,
      text: colors.warning,
      icon: "alert-circle",
      label: "Verification Pending",
    };
  };
  const badge = getBadgeStyle();

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
        <View style={styles.headerContainer}>
          <View style={styles.profileHero}>
            <View
              style={[
                styles.avatarContainer,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.surface,
                  shadowColor: colors.primary,
                },
              ]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <Text style={[styles.heroName, { color: colors.text }]}>
              {session?.user?.name}
            </Text>
            <Text style={[styles.heroEmail, { color: colors.textSecondary }]}>
              {session?.user?.email}
            </Text>

            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color="#FFB300" />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {ratingData?.average === "New" || !ratingData?.average
                  ? "No Rating(s)"
                  : ratingData?.average}

                {ratingData?.count ? ` (${ratingData.count})` : ""}
              </Text>
            </View>

            <View
              style={[styles.verificationPill, { backgroundColor: badge.bg }]}
            >
              <Ionicons name={badge.icon as any} size={14} color={badge.text} />
              <Text style={[styles.verificationText, { color: badge.text }]}>
                {badge.label}
              </Text>
            </View>

            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.adminPill,
                  { backgroundColor: colors.text, shadowColor: colors.text },
                ]}
                onPress={() => {
                  router.push("/admin/dashboard" as any);
                }}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={colors.background}
                />
                <Text
                  style={[styles.adminPillText, { color: colors.background }]}
                >
                  Dashboard
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.background}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.cardsContainer}>
          <InfoCard
            title="Address"
            onEdit={() => {
              setModalState({
                type: "location",
                initialData: {
                  address: userRecord?.profile?.defaultAddress ?? "",
                  latitude: userRecord?.profile?.defaultLat ?? 0,
                  longitude: userRecord?.profile?.defaultLong ?? 0,
                },
              });
            }}
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
                  <Text
                    style={[styles.locationAddress, { color: colors.text }]}
                  >
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

          <InfoCard
            title="About Me"
            onEdit={() => {
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
              });
            }}
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
            onEdit={() => {
              setModalState({
                type: "preferences",
                initialData: {
                  music: userRecord?.preferences?.music ?? true,
                  chatty: userRecord?.preferences?.chatty ?? true,
                  pets: userRecord?.preferences?.pets ?? false,
                  smoking: userRecord?.preferences?.smoking ?? false,
                },
              });
            }}
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
              title="Earnings"
              empty={!earnings}
              emptyText="Earnings will appear after you complete trips."
            >
              {earnings && (
                <View style={{ gap: 12 }}>
                  <View style={styles.row}>
                    <InfoRow
                      label="Lifetime"
                      value={formatCurrency(earnings.totals.lifetimeCents)}
                    />
                    <InfoRow
                      label="This Month"
                      value={formatCurrency(earnings.totals.monthCents)}
                    />
                  </View>
                  <View style={styles.row}>
                    <InfoRow
                      label="This Week"
                      value={formatCurrency(earnings.totals.weekCents)}
                    />
                    <InfoRow
                      label="Avg / Trip"
                      value={formatCurrency(earnings.stats.avgPerTripCents)}
                    />
                  </View>
                  <InfoRow
                    label="Completed Trips"
                    value={earnings.stats.completedTripCount.toString()}
                  />
                </View>
              )}
            </InfoCard>
          )}

          {isDriver && (
            <InfoCard
              title="Vehicle Details"
              onEdit={() => {
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
              }}
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
                    <Ionicons
                      name="car-sport"
                      size={24}
                      color={colors.primary}
                    />
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
        </View>
      </ScrollView>

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
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 24,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  profileHero: {
    alignItems: "center",
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  avatarText: { fontSize: 40, fontWeight: "bold", color: "#fff" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  heroEmail: { fontSize: 15, marginBottom: 8 },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "600",
  },

  verificationPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  verificationText: { fontSize: 13, fontWeight: "600" },

  adminPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  adminPillText: {
    fontSize: 14,
    fontWeight: "700",
  },

  cardsContainer: {
    gap: 6,
  },
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
    marginTop: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
  },
  signOutText: { fontSize: 16, fontWeight: "600" },
});
