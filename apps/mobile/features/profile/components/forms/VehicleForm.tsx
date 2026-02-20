import { updateVehicleSchema, type UpdateVehicleInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { ControlledInput } from "@/components/form/ControlledInput";
import { ControlledNumberSelector } from "@/components/form/ControlledNumberSelector";
import { SubmitButton } from "@/components/form/SubmitButton";
import { FormSection } from "@/components/ui/FormSection";
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
    onSuccess,
  });

  const handleSave = methods.handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <FormSection
          title="VEHICLE IDENTIFICATION"
          description="Riders use this information to identify your vehicle during pickup."
        >
          <View style={styles.row}>
            <View style={styles.flexItem}>
              <ControlledInput
                name="make"
                label="MAKE"
                placeholder="e.g. Toyota"
              />
            </View>
            <View style={styles.flexItem}>
              <ControlledInput
                name="model"
                label="MODEL"
                placeholder="e.g. Corolla"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flexItem}>
              <ControlledInput
                name="color"
                label="COLOR"
                placeholder="e.g. Silver"
              />
            </View>
            <View style={styles.flexItem}>
              <ControlledInput
                name="plate"
                label="LICENSE PLATE"
                placeholder="CABC 123"
                autoCapitalize="characters"
              />
            </View>
          </View>
        </FormSection>

        <FormSection
          title="CAPACITY"
          description="Maximum number of passengers you can accommodate."
        >
          <ControlledNumberSelector
            name="seats"
            label="AVAILABLE SEATS"
            min={1}
            max={8}
          />
        </FormSection>

        <View style={styles.footer}>
          <SubmitButton
            title="SAVE VEHICLE DETAILS"
            onPress={() => {
              void handleSave();
            }}
            variant="primary"
            size="lg"
          />
        </View>
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  flexItem: {
    flex: 1,
  },
  footer: {
    marginTop: 8,
  },
});
