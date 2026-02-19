import type { UpdateProfileInput } from "@hitchly/db";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ModalSheet } from "@/components/ui/ModalSheet";
import { ProfileForm } from "@/features/profile/components/forms/ProfileForm";
import { InfoCard } from "@/features/profile/components/InfoCard";
import { InfoRow } from "@/features/profile/components/InfoRow";

interface AboutMeSectionProps {
  profile: {
    bio: string | null;
    faculty: string | null;
    year: number | null;
    universityRole: UpdateProfileInput["universityRole"];
  };
  onSuccess: () => void;
}

export function AboutMeSection({ profile, onSuccess }: AboutMeSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = (): void => {
    setIsOpen(false);
    onSuccess();
  };

  return (
    <>
      <InfoCard
        title="About Me"
        onEdit={() => {
          setIsOpen(true);
        }}
        empty={!profile.bio && !profile.faculty}
        emptyText="Complete your profile to let others know who they're riding with."
        actionLabel="Add Bio"
      >
        <View style={styles.container}>
          <InfoRow label="Bio" value={profile.bio ?? "No bio set"} fullWidth />

          <View style={styles.row}>
            <InfoRow label="Faculty" value={profile.faculty ?? "-"} />
            <InfoRow label="Year" value={profile.year?.toString() ?? "-"} />
          </View>

          <View style={styles.row}>
            <InfoRow
              label="University Role"
              value={profile.universityRole ?? "student"}
              capitalize
            />
          </View>
        </View>
      </InfoCard>

      <ModalSheet
        title="Edit Profile"
        visible={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      >
        <ProfileForm
          initialData={{
            bio: profile.bio ?? "",
            faculty: profile.faculty ?? "",
            year: profile.year ?? 1,
            universityRole: profile.universityRole ?? "student",
          }}
          onSuccess={handleSuccess}
        />
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
