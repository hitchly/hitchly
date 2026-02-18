import { Ionicons } from "@expo/vector-icons";
import type { UpdateVehicleInput } from "@hitchly/db";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { InfoCard } from "@/components/ui/Card";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { useTheme } from "@/context/theme-context";
import { VehicleForm } from "@/features/profile/components/forms/VehicleForm";

interface VehicleSectionProps {
  vehicle: UpdateVehicleInput | null;
  onSuccess: () => void;
}

export function VehicleSection({ vehicle, onSuccess }: VehicleSectionProps) {
  const { colors, fonts } = useTheme();
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
            <View
              style={[
                styles.vehicleIcon,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="car-sport" size={24} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.vehicleName, { color: colors.text }]}>
                {vehicle.color} {vehicle.make} {vehicle.model}
              </Text>
              <Text
                style={[
                  styles.vehiclePlate,
                  { color: colors.textSecondary, fontFamily: fonts.mono },
                ]}
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
              <Text style={[styles.seatText, { color: colors.textSecondary }]}>
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
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "700",
  },
  vehiclePlate: {
    fontSize: 13,
    marginTop: 2,
  },
  seatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  seatText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
