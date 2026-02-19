import { Ionicons } from "@expo/vector-icons";
import { formatCoordinatePair } from "@hitchly/utils";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "@/components/ui/card/InfoCard";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { useTheme } from "@/context/theme-context";
import { LocationForm } from "@/features/profile/components/forms/LocationForm";

interface AddressSectionProps {
  profile: {
    defaultAddress: string | null;
    defaultLat: number | null;
    defaultLong: number | null;
  };
  onSuccess: () => void;
}

export function AddressSection({ profile, onSuccess }: AddressSectionProps) {
  const { colors, fonts } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = (): void => {
    setIsOpen(false);
    onSuccess();
  };

  return (
    <>
      <InfoCard
        title="Home Address"
        onEdit={() => {
          setIsOpen(true);
        }}
        empty={(profile.defaultAddress ?? "") === ""}
        actionLabel="Set Address"
      >
        <View style={styles.locationRow}>
          <View
            style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="location" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.addressText, { color: colors.text }]}>
              {profile.defaultAddress ?? "No address set"}
            </Text>
            <Text
              style={[
                styles.coordsText,
                { color: colors.textSecondary, fontFamily: fonts.mono },
              ]}
            >
              {formatCoordinatePair(
                profile.defaultLat ?? 0,
                profile.defaultLong ?? 0
              )}
            </Text>
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
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addressText: { fontSize: 16, fontWeight: "600" },
  coordsText: { fontSize: 12 },
});
