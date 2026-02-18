import { updateVehicleSchema, type UpdateVehicleInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { ControlledInput } from "@/components/form/ControlledInput";
import { ControlledNumberSelector } from "@/components/form/ControlledNumberSelector";
import { SubmitButton } from "@/components/form/SubmitButton";
import { trpc } from "@/lib/trpc";

interface VehicleFormProps {
  initialData: UpdateVehicleInput;
  onSuccess: () => void;
}

export function VehicleForm({ initialData, onSuccess }: VehicleFormProps) {
  const methods = useForm<UpdateVehicleInput>({
    defaultValues: initialData,
    resolver: zodResolver(updateVehicleSchema),
  });

  const mutation = trpc.profile.updateVehicle.useMutation({
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleOnPress = (): void => {
    void methods.handleSubmit((data) => {
      mutation.mutate(data);
    })();
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        {/* Make & Model Row */}
        <View style={styles.row}>
          <View style={styles.flexItem}>
            <ControlledInput name="make" label="Make" placeholder="Toyota" />
          </View>
          <View style={styles.flexItem}>
            <ControlledInput name="model" label="Model" placeholder="Corolla" />
          </View>
        </View>

        {/* Color & Plate Row */}
        <View style={styles.row}>
          <View style={styles.flexItem}>
            <ControlledInput name="color" label="Color" placeholder="Grey" />
          </View>
          <View style={styles.flexItem}>
            <ControlledInput
              name="plate"
              label="License Plate"
              placeholder="ABCD 123"
              autoCapitalize="characters"
            />
          </View>
        </View>

        <ControlledNumberSelector
          name="seats"
          label="Total Passenger Seats"
          min={1}
          max={8}
        />

        <SubmitButton
          title="Save Vehicle"
          onPress={handleOnPress}
          isLoading={mutation.isPending}
        />
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  flexItem: {
    flex: 1,
  },
});
