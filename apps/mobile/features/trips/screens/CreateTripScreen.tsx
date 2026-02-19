import { useRouter } from "expo-router";
import { FormProvider } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";

import { ControlledDateTimePicker } from "@/components/form/ControlledDateTimePicker";
import { ControlledInput } from "@/components/form/ControlledInput";
import { ControlledNumericStepper } from "@/components/form/ControlledNumericStepper";
import { Button } from "@/components/ui/Button";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import {
  useCreateTrip,
  type CreateTripFormData,
} from "@/features/trips/hooks/useCreateTrip";

export function CreateTripScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    methods,
    isToCampus,
    setIsToCampus,
    defaultAddress,
    isPending,
    onSubmit,
  } = useCreateTrip();

  const handleOnPress = () => {
    void onSubmit();
  };

  return (
    <ModalSheet
      title="Post a Ride"
      visible={true}
      onClose={() => {
        router.back();
      }}
    >
      <FormProvider {...methods}>
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SegmentedControl<"to" | "from">
            label="Direction"
            value={isToCampus ? "to" : "from"}
            onChange={(val: "to" | "from") => {
              setIsToCampus(val === "to");
            }}
            options={[
              { label: "To McMaster", value: "to" },
              { label: "From McMaster", value: "from" },
            ]}
          />

          {!defaultAddress && (
            <View
              style={[
                styles.hintBox,
                { backgroundColor: `${colors.warning}15` },
              ]}
            >
              <Text
                variant="caption"
                color={colors.warning}
                style={{ fontWeight: "600" }}
              >
                💡 Set your home address in Profile to enable auto-fill.
              </Text>
            </View>
          )}

          <ControlledInput<CreateTripFormData>
            name="origin"
            label="Origin"
            placeholder="Enter pickup location"
          />

          <ControlledInput<CreateTripFormData>
            name="destination"
            label="Destination"
            placeholder="Enter drop-off location"
          />

          <ControlledDateTimePicker<CreateTripFormData>
            name="departureTime"
            label="Departure Date & Time"
            minimumDate={new Date()}
          />

          <ControlledNumericStepper<CreateTripFormData>
            name="maxSeats"
            label="Available Seats"
            // TODO: min and max seats should be based on drivers vehicle
            min={1}
            max={5}
          />

          <Button
            title="Create Trip"
            onPress={handleOnPress}
            isLoading={isPending}
            style={styles.submitButton}
          />
        </ScrollView>
      </FormProvider>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  formContent: { paddingBottom: 40 },
  hintBox: { padding: 12, borderRadius: 8, marginBottom: 20 },
  submitButton: { marginTop: 8 },
});
