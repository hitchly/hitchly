import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Skeleton } from "@/components/ui/Skeleton";
import { useTheme } from "@/context/theme-context";
import { PreferencesSection } from "@/features/profile/components/sections/PreferencesSection";
import { ProfileHero } from "@/features/profile/components/sections/ProfileHero";
import { VehicleSection } from "@/features/profile/components/sections/VehicleSection";
import { useProfile } from "@/features/profile/hooks/useProfile";

export function DriverProfileScreen() {
  const { colors } = useTheme();
  const p = useProfile();

  if (p.isLoading || !p.userRecord) {
    return <Skeleton text="Loading Profile..." />;
  }

  return (
    <SafeAreaView
      style={{ backgroundColor: colors.background, flex: 1 }}
      edges={["top"]}
    >
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
        <ProfileHero
          name={p.session?.user.name ?? "Hitchly Driver"}
          email={p.session?.user.email ?? ""}
          rating={p.ratingData?.average ?? "No Ratings"}
          ratingCount={p.ratingData?.count ?? 0}
          isVerified={p.session?.user.emailVerified ?? false}
        />

        <View style={styles.cardsContainer}>
          <VehicleSection
            vehicle={p.userRecord.vehicle}
            onSuccess={p.onSuccess}
          />

          <PreferencesSection
            preferences={p.userRecord.preferences}
            onSuccess={p.onSuccess}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40, paddingHorizontal: 20 },
  cardsContainer: { gap: 12 },
  signOut: { marginTop: 8 },
});
