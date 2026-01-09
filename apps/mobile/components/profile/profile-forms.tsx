import Ionicons from "@expo/vector-icons/Ionicons";
import {
  saveAddressSchema,
  updatePreferencesSchema,
  updateProfileSchema,
  updateVehicleSchema,
  type SaveAddressInput,
  type UpdatePreferencesInput,
  type UpdateProfileInput,
  type UpdateVehicleInput,
} from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../context/theme-context";
import { useGPSLocation } from "../../hooks/use-gps-location";
import { trpc } from "../../lib/trpc";
import {
  ControlledChipGroup,
  ControlledInput,
  ControlledLocationInput,
  ControlledNumberSelector,
  ControlledSegmentedControl,
  ControlledSwitch,
  SubmitButton,
} from "../ui/form";

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

export function PreferencesForm({
  initialData,
  onSuccess,
}: {
  initialData: UpdatePreferencesInput;
  onSuccess: () => void;
}) {
  const theme = useTheme();
  const { control, handleSubmit } = useForm<UpdatePreferencesInput>({
    defaultValues: initialData,
    resolver: zodResolver(updatePreferencesSchema),
  });

  const mutation = trpc.profile.updatePreferences.useMutation({ onSuccess });

  return (
    <View style={styles.container}>
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

export function LocationForm({
  initialData,
  onSuccess,
}: {
  initialData: SaveAddressInput;
  onSuccess: () => void;
}) {
  const theme = useTheme();

  const { control, handleSubmit, setValue, watch } = useForm<SaveAddressInput>({
    resolver: zodResolver(saveAddressSchema),
    defaultValues: {
      address: initialData.address,
      latitude: initialData.latitude ?? 0,
      longitude: initialData.longitude ?? 0,
    },
  });

  const [lat, long] = watch(["latitude", "longitude"]);
  const isVerified = lat !== 0 && long !== 0;

  const mutation = trpc.location.saveDefaultAddress.useMutation({
    onSuccess: () => onSuccess(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const { getLocation, isGeocoding } = useGPSLocation((loc) => {
    setValue("address", loc.address);
    setValue("latitude", loc.latitude);
    setValue("longitude", loc.longitude);
  });

  const onSubmit = (data: SaveAddressInput) => {
    if (!isVerified) {
      Alert.alert(
        "Invalid Address",
        "Please select a valid address from the list."
      );
      return;
    }
    mutation.mutate(data);
  };

  return (
    <View style={styles.container}>
      <ControlledLocationInput
        control={control}
        name="address"
        label="Address"
        placeholder="1280 Main St W, Hamilton"
        onTextChange={() => {
          setValue("latitude", 0);
          setValue("longitude", 0);
        }}
        onSelect={(d) => {
          setValue("latitude", d.lat);
          setValue("longitude", d.long);
        }}
      />

      <TouchableOpacity
        style={styles.gpsRow}
        onPress={getLocation}
        disabled={isGeocoding}
      >
        <Ionicons name="navigate-circle" size={20} color={theme.primary} />
        <Text style={[styles.gpsText, { color: theme.primary }]}>
          Use Current Location
        </Text>
      </TouchableOpacity>

      <SubmitButton
        title={isVerified ? "Save Address" : "Select an Address"}
        onPress={handleSubmit(onSubmit)}
        isPending={mutation.isPending || isGeocoding}
        disabled={!isVerified || isGeocoding}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  switchList: { borderRadius: 12, padding: 8 },
  gpsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  gpsText: { marginLeft: 8, fontWeight: "600" },
});
