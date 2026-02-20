import type { UpdateVehicleInput } from "@hitchly/db";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { IconBox } from "@/components/ui/IconBox";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { VehicleForm } from "@/features/profile/components/forms/VehicleForm";
import { InfoCard } from "@/features/profile/components/InfoCard";

interface VehicleSectionProps {
  vehicle: UpdateVehicleInput | null;
  onSuccess: () => void;
}

export function VehicleSection({ vehicle, onSuccess }: VehicleSectionProps) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = (): void => {
    setIsOpen(false);
    onSuccess();
  };

  return (
    <>
      <InfoCard
        title="Vehicle Details"
        onEdit={() => {
          setIsOpen(true);
        }}
        empty={vehicle === null}
        emptyText="Add your vehicle to start driving."
        actionLabel="Add Vehicle"
      >
        {vehicle !== null ? (
          <View style={styles.vehicleRow}>
            {/* Standardized IconBox with larger custom styling */}
            <IconBox
              name="car-sport-outline"
              variant="subtle"
              size={24}
              style={styles.iconBoxOverride}
            />

            <View style={styles.textContainer}>
              <Text variant="bodySemibold">
                {vehicle.color} {vehicle.make} {vehicle.model}
              </Text>
              <Text
                variant="mono"
                color={colors.textSecondary}
                style={styles.vehiclePlate}
              >
                {vehicle.plate}
              </Text>
            </View>

            <View
              style={[
                styles.seatBadge,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Text variant="captionSemibold" color={colors.textSecondary}>
                {vehicle.seats.toString()} Seats
              </Text>
            </View>
          </View>
        ) : null}
      </InfoCard>

      <ModalSheet
        title="Edit Vehicle"
        visible={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      >
        <VehicleForm
          initialData={{
            make: vehicle?.make ?? "",
            model: vehicle?.model ?? "",
            color: vehicle?.color ?? "",
            plate: vehicle?.plate ?? "",
            seats: vehicle?.seats ?? 4,
          }}
          onSuccess={handleSuccess}
        />
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBoxOverride: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  vehiclePlate: {
    fontSize: 13,
  },
  seatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
