import React from "react";
import { Controller } from "react-hook-form";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/theme-context";

// --- 1. Controlled Text Input ---
export function ControlledInput({
  control,
  name,
  label,
  placeholder,
  multiline,
  numeric,
  autoCapitalize,
}: any) {
  const theme = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            {label}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: error ? theme.error : theme.border,
                ...(error ? { backgroundColor: theme.errorBackground } : {}),
              },
              multiline && styles.textArea,
            ]}
            onBlur={onBlur}
            onChangeText={(val) =>
              numeric
                ? onChange(val ? parseInt(val) : undefined)
                : onChange(val)
            }
            value={value?.toString() || ""}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            multiline={multiline}
            keyboardType={numeric ? "number-pad" : "default"}
            autoCapitalize={autoCapitalize}
          />
          {error && (
            <Text style={[styles.errorText, { color: theme.error }]}>
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}

// --- 2. Horizontal Number Selector ---
export function ControlledNumberSelector({
  control,
  name,
  label,
  min,
  max,
}: any) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const theme = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            {label}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {options.map((num) => {
              const isActive = value === num;
              return (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.numberCircle,
                    {
                      backgroundColor: isActive
                        ? theme.primary
                        : theme.background,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => onChange(num)}
                >
                  <Text
                    style={[
                      styles.numberText,
                      { color: isActive ? "#fff" : theme.textSecondary },
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {error && (
            <Text style={[styles.errorText, { color: theme.error }]}>
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}

// --- 3. Segmented Control ---
export function ControlledSegmentedControl({
  control,
  name,
  label,
  options,
}: any) {
  const theme = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            {label}
          </Text>
          <View
            style={[
              styles.segmentContainer,
              { backgroundColor: theme.background },
            ]}
          >
            {options.map((option: any) => {
              const isActive = value === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segmentBtn,
                    isActive && [
                      styles.segmentBtnActive,
                      { backgroundColor: theme.surface },
                    ],
                  ]}
                  onPress={() => onChange(option.value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: isActive ? theme.primary : theme.textSecondary },
                      isActive && styles.segmentTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {error && (
            <Text style={[styles.errorText, { color: theme.error }]}>
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}

// --- 4. Chip Group ---
export function ControlledChipGroup({ control, name, label, options }: any) {
  const theme = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            {label}
          </Text>
          <View style={styles.chipGrid}>
            {options.map((option: any) => {
              const isActive = value === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.selectChip,
                    {
                      backgroundColor: isActive
                        ? theme.primaryLight
                        : theme.surface,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => onChange(option.value)}
                >
                  <Text
                    style={[
                      styles.selectChipText,
                      { color: isActive ? theme.primary : theme.textSecondary },
                      isActive && styles.selectChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {error && (
            <Text style={[styles.errorText, { color: theme.error }]}>
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}

// --- 5. Switch ---
export function ControlledSwitch({ control, name, label }: any) {
  const theme = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={[styles.switchRow, { borderColor: theme.border }]}>
          <Text style={[styles.switchLabel, { color: theme.text }]}>
            {label}
          </Text>
          <Switch
            trackColor={{ false: "#e0e0e0", true: theme.primaryLight }}
            thumbColor={value ? theme.primary : "#f4f3f4"}
            onValueChange={onChange}
            value={value}
          />
        </View>
      )}
    />
  );
}

// --- 6. Submit Button ---
export function SubmitButton({ title, onPress, isPending }: any) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[styles.saveBtn, { backgroundColor: theme.primary }]}
      onPress={onPress}
      disabled={isPending}
    >
      {isPending ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.saveBtnText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  inputGroup: { marginBottom: 0 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: { fontSize: 12, marginTop: 4, marginLeft: 2 },
  textArea: { minHeight: 100, textAlignVertical: "top" },

  // Number Selector
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  numberText: { fontSize: 16, fontWeight: "600" },

  // Segmented Control
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    height: 48,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentBtnActive: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: "600" },
  segmentTextActive: { fontWeight: "700" },

  // Chip Grid
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  selectChipText: { fontSize: 14, fontWeight: "500" },
  selectChipTextActive: { fontWeight: "600" },

  // Switch
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  switchLabel: { fontSize: 16 },

  // Button
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
