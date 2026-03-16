import { useRouter } from "expo-router";
import { Controller, FormProvider } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ControlledDateTimePicker } from "@/components/form/ControlledDateTimePicker";
import { ControlledLocationInput } from "@/components/form/ControlledLocationInput";
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
  const insets = useSafeAreaInsets();
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
          contentContainerStyle={[
            styles.formContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 100 },
          ]}
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
              <ControlledLocationInput<CreateTripFormData>
                control={methods.control as any}
                name="origin"
                label="PICKUP LOCATION"
                placeholder="Search pickup point..."
              />
              <ControlledLocationInput<CreateTripFormData>
                control={methods.control as any}
                name="destination"
                label="DROP-OFF LOCATION"
                placeholder="Search drop-off point..."
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

          <FormSection
            title="REPEAT"
            description="Set this ride to repeat on selected weekdays."
          >
            <Controller
              control={methods.control}
              name="isRecurring"
              render={({ field: { value, onChange } }) => (
                <SegmentedControl<"once" | "recurring">
                  value={value ? "recurring" : "once"}
                  onChange={(val) => {
                    onChange(val === "recurring");
                  }}
                  options={[
                    { label: "ONE-TIME", value: "once" },
                    { label: "RECURRING", value: "recurring" },
                  ]}
                />
              )}
            />

            <Controller
              control={methods.control}
              name="daysOfWeek"
              render={({ field: { value = [], onChange } }) => {
                const days = [
                  { label: "S", index: 0 },
                  { label: "M", index: 1 },
                  { label: "T", index: 2 },
                  { label: "W", index: 3 },
                  { label: "T", index: 4 },
                  { label: "F", index: 5 },
                  { label: "S", index: 6 },
                ];

                const toggleDay = (idx: number) => {
                  if (value.includes(idx)) {
                    onChange(value.filter((d: number) => d !== idx));
                  } else {
                    onChange([...value, idx].sort());
                  }
                };

                return (
                  <View style={styles.weekdayRow}>
                    {days.map((day) => {
                      const selected = value.includes(day.index);
                      return (
                        <Text
                          key={day.index}
                          variant="captionSemibold"
                          style={[
                            styles.weekdayPill,
                            selected && {
                              backgroundColor: colors.primary,
                              color: colors.surface,
                            },
                          ]}
                          onPress={() => toggleDay(day.index)}
                        >
                          {day.label}
                        </Text>
                      );
                    })}
                  </View>
                );
              }}
            />
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
  formContent: {},
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
    marginTop: 24,
    gap: 16,
  },
  disclaimer: {
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 8,
  },
  weekdayPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    textAlign: "center",
    overflow: "hidden",
  },
});
