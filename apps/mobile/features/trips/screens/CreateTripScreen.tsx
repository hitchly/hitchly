import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { DateTimePickerComponent } from "@/components/ui/datetime-picker";
import { NumericStepper } from "@/components/ui/numeric-stepper";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { DirectionToggle } from "@/features/trips/components/DirectionToggle";
import { TripFormGroup } from "@/features/trips/components/TripFormGroup";
import { useCreateTrip } from "@/features/trips/hooks/useCreateTrip";

export function CreateTripScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    form,
    errors,
    isToCampus,
    defaultAddress,
    isPending,
    toggleDirection,
    updateForm,
    handleSubmit,
  } = useCreateTrip();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
          hitSlop={20}
          style={styles.backButton}
        >
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text variant="h2">Create Trip</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DirectionToggle isToCampus={isToCampus} onToggle={toggleDirection} />

        {!defaultAddress && (
          <View
            style={[styles.hintBox, { backgroundColor: `${colors.warning}15` }]}
          >
            <Text
              variant="caption"
              color={colors.warning}
              style={{ fontWeight: "600" }}
            >
              💡 Set your home address in your Profile to auto-fill these
              fields.
            </Text>
          </View>
        )}

        <TripFormGroup label="Origin" error={errors.origin}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: errors.origin ? colors.error : colors.border,
                color: colors.text,
              },
            ]}
            value={form.origin}
            onChangeText={(text) => {
              updateForm("origin", text);
            }}
            placeholder="Enter origin address"
            placeholderTextColor={colors.textTertiary}
          />
        </TripFormGroup>

        <TripFormGroup label="Destination" error={errors.destination}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: errors.destination ? colors.error : colors.border,
                color: colors.text,
              },
            ]}
            value={form.destination}
            onChangeText={(text) => {
              updateForm("destination", text);
            }}
            placeholder="Enter destination address"
            placeholderTextColor={colors.textTertiary}
          />
        </TripFormGroup>

        <TripFormGroup
          label="Departure Date & Time"
          error={errors.departureDateTime}
        >
          <DateTimePickerComponent
            value={form.departureDateTime}
            onChange={(date) => {
              updateForm("departureDateTime", date);
            }}
            minimumDate={new Date(Date.now() + 15 * 60 * 1000)}
            error={errors.departureDateTime}
          />
        </TripFormGroup>

        <TripFormGroup label="Available Seats" error={errors.availableSeats}>
          <NumericStepper
            value={form.availableSeats}
            onValueChange={(val) => {
              updateForm("availableSeats", val);
            }}
            min={1}
            max={5}
            error={errors.availableSeats}
          />
        </TripFormGroup>

        <Button
          title="Create Trip"
          onPress={handleSubmit}
          isLoading={isPending}
          style={styles.submitButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: { flex: 1 },
  formContent: { padding: 20, paddingBottom: 40 },
  hintBox: { padding: 12, borderRadius: 8, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  submitButton: { marginTop: 8 },
});
