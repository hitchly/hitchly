import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { AboutMeSection } from "@/features/profile/components/sections/AboutMeSection";
import { AddressSection } from "@/features/profile/components/sections/AddressSection";
import { PaymentsSection } from "@/features/profile/components/sections/PaymentsSection";
import { PreferencesSection } from "@/features/profile/components/sections/PreferencesSection";
import { ProfileHeader } from "@/features/profile/components/sections/ProfileHeader";
import { useProfile } from "@/features/profile/hooks/useProfile";
import type { RouterOutputs } from "@/lib/trpc";

type UserRecord = NonNullable<RouterOutputs["profile"]["getMe"]>;
type ProfileData = UserRecord["profile"];
type PreferenceData = UserRecord["preferences"];

function AccountMasterSection() {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionGroup}>
      <Text
        variant="label"
        color={colors.textSecondary}
        style={styles.sectionLabel}
      >
        ACCOUNT
      </Text>
      <PaymentsSection />
    </View>
  );
}

interface ProfileMasterProps {
  profile: ProfileData;
  preferences: PreferenceData;
  onSuccess: () => void;
}

function ProfileMasterSection({
  profile,
  preferences,
  onSuccess,
}: ProfileMasterProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionGroup}>
      <Text
        variant="label"
        color={colors.textSecondary}
        style={styles.sectionLabel}
      >
        PROFILE
      </Text>
      <View style={styles.cardsContainer}>
        <AddressSection profile={profile} onSuccess={onSuccess} />
        <AboutMeSection profile={profile} onSuccess={onSuccess} />
        <PreferencesSection preferences={preferences} onSuccess={onSuccess} />
      </View>
    </View>
  );
}

export function RiderProfileScreen() {
  const { colors } = useTheme();
  const p = useProfile();

  if (p.isLoading || !p.userRecord) {
    return <Skeleton text="LOADING PROFILE..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.flex}
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
          name={p.session?.user.name ?? "Hitchly Rider"}
          email={p.session?.user.email ?? ""}
          rating={p.ratingData?.average ?? "New"}
          ratingCount={p.ratingData?.count ?? 0}
          isVerified={p.session?.user.emailVerified ?? false}
        />

        <AccountMasterSection />

        <ProfileMasterSection
          profile={p.userRecord.profile}
          preferences={p.userRecord.preferences}
          onSuccess={p.onSuccess}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sectionGroup: {
    marginTop: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardsContainer: {
    gap: 12,
  },
});
