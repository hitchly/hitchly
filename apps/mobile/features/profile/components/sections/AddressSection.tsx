import { formatCoordinatePair } from "@hitchly/utils";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { IconBox } from "@/components/ui/IconBox";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { LocationForm } from "@/features/profile/components/forms/LocationForm";
import { InfoCard } from "@/features/profile/components/InfoCard";

interface AddressSectionProps {
  profile: {
    defaultAddress: string | null;
    defaultLat: number | null;
    defaultLong: number | null;
  };
  onSuccess: () => void;
}

export function AddressSection({ profile, onSuccess }: AddressSectionProps) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = (): void => {
    setIsOpen(false);
    onSuccess();
  };

  const hasAddress = (profile.defaultAddress ?? "") !== "";

  return (
    <>
      <InfoCard
        title="Home Address"
        onEdit={() => {
          setIsOpen(true);
        }}
        empty={!hasAddress}
        actionLabel="Set Address"
      >
        <View style={styles.locationRow}>
          <IconBox name="location-outline" />

          <View style={styles.textContainer}>
            <Text variant="bodySemibold">
              {profile.defaultAddress ?? "No address set"}
            </Text>
            {hasAddress && (
              <Text
                variant="mono"
                color={colors.textSecondary}
                style={styles.coords}
              >
                {formatCoordinatePair(
                  profile.defaultLat ?? 0,
                  profile.defaultLong ?? 0
                )}
              </Text>
            )}
          </View>
        </View>
      </InfoCard>

      <ModalSheet
        title="Edit Address"
        visible={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      >
        <LocationForm
          initialData={{
            address: profile.defaultAddress ?? "",
            latitude: profile.defaultLat ?? 0,
            longitude: profile.defaultLong ?? 0,
          }}
          onSuccess={handleSuccess}
        />
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  locationRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  textContainer: { flex: 1 },
  coords: { fontSize: 10, marginTop: 2, letterSpacing: 0.5 },
});
