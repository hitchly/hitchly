import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../context/theme-context";
import { trpc } from "../../lib/trpc";

// Validators
import {
  updatePreferencesSchema,
  updateProfileSchema,
  updateVehicleSchema,
  type UpdatePreferencesInput,
  type UpdateProfileInput,
  type UpdateVehicleInput,
} from "@hitchly/db/validators/profile";

// UI Components
import {
  ControlledChipGroup,
  ControlledInput,
  ControlledNumberSelector,
  ControlledSegmentedControl,
  ControlledSwitch,
  SubmitButton,
} from "../ui/form";

// --- 1. Profile Form ---
export function ProfileForm({
  initialData,
  onSuccess,
}: {
  initialData: UpdateProfileInput;
  onSuccess: () => void;
}) {
  const { control, handleSubmit } = useForm<UpdateProfileInput>({
    defaultValues: initialData,
    resolver: zodResolver(updateProfileSchema),
  });

  const mutation = trpc.profile.updateProfile.useMutation({ onSuccess });

  return (
    <View style={styles.container}>
      <ControlledInput
        control={control}
        name="bio"
        label="Bio"
        placeholder="Tell us about yourself..."
        multiline
      />

      <ControlledInput
        control={control}
        name="faculty"
        label="Faculty"
        placeholder="Engineering"
      />

      <ControlledNumberSelector
        control={control}
        name="year"
        label="Year of Study"
        min={1}
        max={10}
      />

      <ControlledSegmentedControl
        control={control}
        name="appRole"
        label="I am a..."
        options={[
          { label: "Rider", value: "rider" },
          { label: "Driver", value: "driver" },
        ]}
      />

      <ControlledChipGroup
        control={control}
        name="universityRole"
        label="University Role"
        options={[
          { label: "Student", value: "student" },
          { label: "Professor", value: "professor" },
          { label: "Staff", value: "staff" },
          { label: "Alumni", value: "alumni" },
          { label: "Other", value: "other" },
        ]}
      />

      <SubmitButton
        title="Save Profile"
        onPress={handleSubmit((data) => mutation.mutate(data))}
        isPending={mutation.isPending}
      />
    </View>
  );
}

// --- 2. Preferences Form ---
export function PreferencesForm({
  initialData,
  onSuccess,
}: {
  initialData: UpdatePreferencesInput;
  onSuccess: () => void;
}) {
  const theme = useTheme(); // Theme Hook
  const { control, handleSubmit } = useForm<UpdatePreferencesInput>({
    defaultValues: initialData,
    resolver: zodResolver(updatePreferencesSchema),
  });

  const mutation = trpc.profile.updatePreferences.useMutation({ onSuccess });

  return (
    <View style={styles.container}>
      {/* Updated to use theme background for the grouped list look */}
      <View style={[styles.switchList, { backgroundColor: theme.background }]}>
        <ControlledSwitch control={control} name="music" label="Play Music" />
        <ControlledSwitch control={control} name="chatty" label="Chatty" />
        <ControlledSwitch control={control} name="pets" label="Pet Friendly" />
        <ControlledSwitch
          control={control}
          name="smoking"
          label="Smoking Allowed"
        />
      </View>
      <SubmitButton
        title="Save Preferences"
        onPress={handleSubmit((data) => mutation.mutate(data))}
        isPending={mutation.isPending}
      />
    </View>
  );
}

// --- 3. Vehicle Form ---
export function VehicleForm({
  initialData,
  onSuccess,
}: {
  initialData: UpdateVehicleInput;
  onSuccess: () => void;
}) {
  const { control, handleSubmit } = useForm<UpdateVehicleInput>({
    defaultValues: initialData,
    resolver: zodResolver(updateVehicleSchema),
  });

  const mutation = trpc.profile.updateVehicle.useMutation({ onSuccess });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <ControlledInput
            control={control}
            name="make"
            label="Make"
            placeholder="Toyota"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <ControlledInput
            control={control}
            name="model"
            label="Model"
            placeholder="Corolla"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <ControlledInput
            control={control}
            name="color"
            label="Color"
            placeholder="Red"
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <ControlledInput
            control={control}
            name="plate"
            label="License Plate"
            placeholder="ABCD 123"
            autoCapitalize="characters"
          />
        </View>
      </View>
      <ControlledNumberSelector
        control={control}
        name="seats"
        label="Seats"
        min={1}
        max={10}
      />

      <SubmitButton
        title="Save Vehicle"
        onPress={handleSubmit((data) => mutation.mutate(data))}
        isPending={mutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  switchList: { borderRadius: 12, padding: 8 },
});
