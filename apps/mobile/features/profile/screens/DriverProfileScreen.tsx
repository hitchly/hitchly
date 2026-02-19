import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { AboutMeSection } from "@/features/profile/components/sections/AboutMeSection";
import { AddressSection } from "@/features/profile/components/sections/AddressSection";
import { PreferencesSection } from "@/features/profile/components/sections/PreferencesSection";
import { ProfileHeader } from "@/features/profile/components/sections/ProfileHeader";
import { VehicleSection } from "@/features/profile/components/sections/VehicleSection";
import { useProfile } from "@/features/profile/hooks/useProfile";

export function DriverProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const p = useProfile();

  if (p.isLoading || !p.userRecord) {
    return <Skeleton text="Loading Profile..." />;
  }

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={p.isRefetching}
            onRefresh={p.handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <ProfileHeader
          name={p.session?.user.name ?? "Hitchly Driver"}
          email={p.session?.user.email ?? ""}
          rating={p.ratingData?.average ?? "New"}
          ratingCount={p.ratingData?.count ?? 0}
          isVerified={p.session?.user.emailVerified ?? false}
        />

        <View style={styles.sectionGroup}>
          <Text
            variant="label"
            color={colors.textSecondary}
            style={styles.sectionLabel}
          >
            Account
          </Text>
          <Card style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                router.push("/(app)/driver/account/payouts");
              }}
            >
              <View style={styles.menuLeft}>
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Ionicons name="cash" size={20} color={colors.primary} />
                </View>
                <Text variant="bodySemibold">Earnings & Payouts</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </Card>
        </View>

        <View style={styles.sectionGroup}>
          <Text
            variant="label"
            color={colors.textSecondary}
            style={styles.sectionLabel}
          >
            Profile
          </Text>
          <View style={styles.cardsContainer}>
            <AddressSection
              profile={p.userRecord.profile}
              onSuccess={p.onSuccess}
            />
            <AboutMeSection
              profile={p.userRecord.profile}
              onSuccess={p.onSuccess}
            />
            <PreferencesSection
              preferences={p.userRecord.preferences}
              onSuccess={p.onSuccess}
            />
            <VehicleSection
              vehicle={p.userRecord.vehicle}
              onSuccess={p.onSuccess}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sectionGroup: { marginTop: 12, marginBottom: 16 },
  sectionLabel: { marginBottom: 12 },
  cardsContainer: { gap: 12 },
  menuCard: { padding: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
