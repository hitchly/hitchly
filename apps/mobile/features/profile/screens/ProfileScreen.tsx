import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { LoadingSkeleton } from "@/components/ui/display";
import { useTheme } from "@/context/theme-context";
import { AboutMeSection } from "@/features/profile/components/sections/AboutMeSection";
import { AddressSection } from "@/features/profile/components/sections/AddressSection";
import { EarningsSection } from "@/features/profile/components/sections/EarningsSection";
import { PreferencesSection } from "@/features/profile/components/sections/PreferencesSection";
import { ProfileHero } from "@/features/profile/components/sections/ProfileHero";
import { VehicleSection } from "@/features/profile/components/sections/VehicleSection";
import { useProfile } from "@/features/profile/hooks/useProfile";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const p = useProfile();

  if (p.isLoading || !p.userRecord) {
    return <LoadingSkeleton text="Loading Profile..." />;
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
          name={p.session?.user.name ?? "Hitchly User"}
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

          {p.isDriver && p.earnings ? (
            <EarningsSection earnings={p.earnings} />
          ) : null}

          {p.isDriver && (
            <VehicleSection
              vehicle={p.userRecord.vehicle}
              onSuccess={p.onSuccess}
            />
          )}

          <Button
            title="Sign Out"
            variant="danger"
            onPress={() => {
              void p.handleSignOut();
            }}
            disabled={p.isSigningOut}
            isLoading={p.isSigningOut}
            style={styles.signOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  cardsContainer: {
    gap: 12,
  },
  signOut: {
    marginTop: 8,
  },
});
