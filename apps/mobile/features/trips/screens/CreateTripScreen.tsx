import { useRouter } from "expo-router";
import { FormProvider } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";

import { ControlledDateTimePicker } from "@/components/form/ControlledDateTimePicker";
import { ControlledInput } from "@/components/form/ControlledInput";
import { ControlledNumericStepper } from "@/components/form/ControlledNumericStepper";
import { SubmitButton } from "@/components/form/SubmitButton";
import { FormSection } from "@/components/ui/FormSection";
import { IconBox } from "@/components/ui/IconBox";
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
          <FormSection title="DIRECTION">
            <SegmentedControl<"to" | "from">
              value={isToCampus ? "to" : "from"}
              onChange={(val) => {
                setIsToCampus(val === "to");
              }}
              options={[
                { label: "TO MCMASTER", value: "to" },
                { label: "FROM MCMASTER", value: "from" },
              ]}
            />
          </FormSection>

          <FormSection
            title="ROUTE"
            description="Specify where you're starting and ending your journey."
          >
            {!defaultAddress && (
              <View
                style={[
                  styles.callout,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <IconBox
                  name="bulb-outline"
                  size={14}
                  variant="subtle"
                  style={styles.calloutIcon}
                />
                <Text
                  variant="caption"
                  color={colors.textSecondary}
                  style={styles.calloutText}
                >
                  Tip: Set your home address in Profile to enable auto-fill.
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <ControlledInput<CreateTripFormData>
                name="origin"
                label="PICKUP LOCATION"
                placeholder="Search pickup point..."
                icon="location-outline"
              />
              <ControlledInput<CreateTripFormData>
                name="destination"
                label="DROP-OFF LOCATION"
                placeholder="Search drop-off point..."
                icon="flag-outline"
              />
            </View>
          </FormSection>

          <FormSection title="LOGISTICS">
            <ControlledDateTimePicker<CreateTripFormData>
              name="departureTime"
              label="DEPARTURE TIME"
              minimumDate={new Date()}
            />

            <View style={styles.stepperContainer}>
              <ControlledNumericStepper<CreateTripFormData>
                name="maxSeats"
                label="AVAILABLE SEATS"
                min={1}
                max={6}
              />
            </View>
          </FormSection>

          <View style={styles.footer}>
            <SubmitButton
              title="PUBLISH RIDE"
              onPress={() => {
                void onSubmit();
              }}
              isLoading={isPending}
              icon="rocket-outline"
            />
            <Text
              variant="caption"
              align="center"
              color={colors.textTertiary}
              style={styles.disclaimer}
            >
              By publishing, you agree to follow the McMaster Community Conduct
              guidelines for safe carpooling.
            </Text>
          </View>
        </ScrollView>
      </FormProvider>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  formContent: {
    paddingBottom: 60,
  },
  inputGroup: {
    gap: 16,
  },
  callout: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  calloutIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  calloutText: {
    flex: 1,
  },
  stepperContainer: {
    marginTop: 8,
  },
  footer: {
    marginTop: 12,
    gap: 16,
  },
  disclaimer: {
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});
