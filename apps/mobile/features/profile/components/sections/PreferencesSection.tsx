import type { UpdatePreferencesInput } from "@hitchly/db";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { PreferencesForm } from "@/features/profile/components/forms/PreferencesForm";
import { InfoCard } from "@/features/profile/components/InfoCard";

interface PreferencesSectionProps {
  preferences: UpdatePreferencesInput | null;
  onSuccess: () => void;
}

export function PreferencesSection({
  preferences,
  onSuccess,
}: PreferencesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = (): void => {
    setIsOpen(false);
    onSuccess();
  };

  return (
    <>
      <InfoCard
        title="Ride Preferences"
        onEdit={() => {
          setIsOpen(true);
        }}
        empty={preferences === null}
        emptyText="Set your ride comfort settings (music, social, etc)."
      >
        {preferences !== null ? (
          <View style={styles.chipContainer}>
            <Chip
              icon="musical-notes"
              label="Music"
              active={preferences.music ?? false}
            />
            <Chip
              icon="chatbubbles"
              label="Social"
              active={preferences.chatty ?? false}
            />
            <Chip icon="paw" label="Pets" active={preferences.pets ?? false} />
            <Chip
              icon="flame"
              label="Smoking"
              active={preferences.smoking ?? false}
            />
          </View>
        ) : null}
      </InfoCard>

      <ModalSheet
        title="Edit Preferences"
        visible={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      >
        <PreferencesForm
          initialData={{
            music: preferences?.music ?? true,
            chatty: preferences?.chatty ?? true,
            pets: preferences?.pets ?? false,
            smoking: preferences?.smoking ?? false,
          }}
          onSuccess={handleSuccess}
        />
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
