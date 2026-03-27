/* eslint-disable */
import { useRouter } from "expo-router";
import { Controller, FormProvider, useWatch } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ControlledDateTimePicker } from "@/components/form/ControlledDateTimePicker";
import { ControlledNumericStepper } from "@/components/form/ControlledNumericStepper";
import { SubmitButton } from "@/components/form/SubmitButton";
import { FormSection } from "@/components/ui/FormSection";
import { IconBox } from "@/components/ui/IconBox";
import { ModalSheet } from "@/components/ui/ModalSheet";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { McMaster } from "@/constants/location";
import { useTheme } from "@/context/theme-context";
import { safeLeaveCreateTripScreen } from "@/lib/safeNavigate";
import {
  useCreateTrip,
  type CreateTripFormData,
  type CreateTripFormInput,
} from "@/features/trips/hooks/useCreateTrip";

function homeLineOrPlaceholder(defaultAddress: string): string {
  const t = defaultAddress.trim();
  return t !== "" ? t : "Not set — add your home address in Profile";
}

function ReadOnlyRouteAddresses({
  isToCampus,
  defaultAddress,
}: {
  isToCampus: boolean;
  defaultAddress: string;
}) {
  const { colors } = useTheme();
  const origin = useWatch<CreateTripFormData, "origin">({ name: "origin" });
  const destination = useWatch<CreateTripFormData, "destination">({
    name: "destination",
  });

  const originStr = typeof origin === "string" ? origin.trim() : "";
  const destStr = typeof destination === "string" ? destination.trim() : "";

  const pickupDisplay =
    originStr !== ""
      ? origin
      : isToCampus
        ? homeLineOrPlaceholder(defaultAddress)
        : McMaster.address;

  const dropoffDisplay =
    destStr !== ""
      ? destination
      : isToCampus
        ? McMaster.address
        : homeLineOrPlaceholder(defaultAddress);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.staticField}>
        <Text variant="label" color={colors.textSecondary}>
          PICKUP LOCATION
        </Text>
        <View
          style={[
            styles.staticValueBox,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceSecondary,
            },
          ]}
        >
          <Text variant="body">{pickupDisplay}</Text>
        </View>
      </View>
      <View style={styles.staticField}>
        <Text variant="label" color={colors.textSecondary}>
          DROP-OFF LOCATION
        </Text>
        <View
          style={[
            styles.staticValueBox,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceSecondary,
            },
          ]}
        >
          <Text variant="body">{dropoffDisplay}</Text>
        </View>
      </View>
    </View>
  );
}

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

  const isRecurring =
    useWatch<CreateTripFormInput>({
      control: methods.control,
      name: "isRecurring",
    }) ?? false;

  return (
    <ModalSheet
      title="Post a Ride"
      visible={true}
      onClose={() => {
        safeLeaveCreateTripScreen(router);
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
            description="Pickup and drop-off use your profile home address and McMaster. Change your home address in Profile if needed."
          >
            {!defaultAddress.trim() && (
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
                  Set your home address in Profile before publishing a ride.
                </Text>
              </View>
            )}

            <ReadOnlyRouteAddresses
              isToCampus={isToCampus}
              defaultAddress={defaultAddress}
            />
          </FormSection>

          <FormSection
            title="REPEAT"
            description="For recurring rides, choose weekdays first; the departure time below applies on those days."
          >
            <Controller
              control={methods.control}
              name="isRecurring"
              render={({ field: { value, onChange } }) => (
                <SegmentedControl<"once" | "recurring">
                  value={value ? "recurring" : "once"}
                  onChange={(val) => {
                    const next = val === "recurring";
                    onChange(next);
                    if (!next) {
                      methods.setValue("daysOfWeek", [], { shouldDirty: true });
                    }
                  }}
                  options={[
                    { label: "ONE-TIME", value: "once" },
                    { label: "RECURRING", value: "recurring" },
                  ]}
                />
              )}
            />

            {isRecurring ? (
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
            ) : null}
          </FormSection>

          <View>
            <ControlledDateTimePicker<CreateTripFormData>
              name="departureTime"
              label="DEPARTURE TIME"
              mode={isRecurring ? "time" : "datetime"}
              minimumDate={
                isRecurring ? undefined : new Date(Date.now() + 15 * 60 * 1000)
              }
            />

            <View style={styles.stepperContainer}>
              <ControlledNumericStepper<CreateTripFormData>
                name="maxSeats"
                label="AVAILABLE SEATS"
                min={1}
                max={6}
              />
            </View>
          </View>

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
  staticField: {
    gap: 6,
  },
  staticValueBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: "center",
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
