import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { Skeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/context/theme-context";
import { AboutMeSection } from "@/features/profile/components/sections/AboutMeSection";
import { AddressSection } from "@/features/profile/components/sections/AddressSection";
import { PreferencesSection } from "@/features/profile/components/sections/PreferencesSection";
import { ProfileHeader } from "@/features/profile/components/sections/ProfileHeader";
import { VehicleSection } from "@/features/profile/components/sections/VehicleSection";
import { useProfile } from "@/features/profile/hooks/useProfile";

export function DriverProfileScreen() {
  const { colors } = useTheme();
  const p = useProfile();

  if (p.isLoading || !p.userRecord) {
    return <Skeleton text="Loading Profile..." />;
  }

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
          rating={p.ratingData?.average ?? "No Ratings"}
          ratingCount={p.ratingData?.count ?? 0}
          isVerified={p.session?.user.emailVerified ?? false}
        />

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },
  cardsContainer: { gap: 12 },
  signOut: { marginTop: 8 },
});
