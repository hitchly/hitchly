import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import React, { useState } from "react";
import { Controller } from "react-hook-form";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/theme-context";
import { Button } from "./button";

// --- 1. Controlled Text Input ---
interface ControlledInputProps extends TextInputProps {
  control: any;
  name: string;
  label: string;
}

export function ControlledInput({
  control,
  name,
  label,
  ...props
}: ControlledInputProps) {
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
              props.multiline && styles.textArea,
            ]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value?.toString() || ""}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            {...props}
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

// --- 2. ADVANCED LOCATION INPUT ---
interface ControlledLocationInputProps {
  control: any;
  name: string;
  label: string;
  placeholder?: string;
  onSelect?: (details: { address: string; lat: number; long: number }) => void;
  onTextChange?: (text: string) => void;
}

type LocationResult = {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
};

export function ControlledLocationInput({
  control,
  name,
  label,
  placeholder,
  onSelect,
  onTextChange,
}: ControlledLocationInputProps) {
  const theme = useTheme();
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Helper: Format Expo Location Data
  const formatLocationData = (
    loc: Location.LocationGeocodedAddress
  ): { title: string; subtitle: string; full: string } | null => {
    let streetLine = loc.street || "";
    const streetNumber =
      loc.streetNumber ||
      (loc.name && !isNaN(Number(loc.name)) ? loc.name : "");

    if (streetNumber && !streetLine.startsWith(streetNumber)) {
      streetLine = `${streetNumber} ${streetLine}`;
    }

    streetLine = streetLine.trim();
    if (!streetLine) return null;

    const regionParts = [loc.city, loc.region, loc.isoCountryCode].filter(
      Boolean
    );
    const regionLine = regionParts.join(", ");

    // Determine POI
    const isPOI =
      loc.name &&
      isNaN(Number(loc.name)) &&
      loc.name !== loc.street &&
      loc.name !== streetLine;

    let title = "";
    let subtitle = "";

    if (isPOI) {
      title = loc.name!;
      subtitle = `${streetLine}, ${regionLine}`;
    } else {
      title = streetLine;
      subtitle = regionLine;
    }

    const full = isPOI ? `${title}, ${subtitle}` : `${title}, ${regionLine}`;
    return { title, subtitle, full };
  };

  const handleSearch = async (query: string) => {
    if (!query || query.length < 5) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const geocoded = await Location.geocodeAsync(query);
      const topMatches = geocoded.slice(0, 4);

      if (topMatches.length === 0) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      const formatted = await Promise.all(
        topMatches.map(async (match, index) => {
          try {
            const [reverse] = await Location.reverseGeocodeAsync({
              latitude: match.latitude,
              longitude: match.longitude,
            });

            if (!reverse) return null;
            const fmt = formatLocationData(reverse);
            if (!fmt) return null;

            return {
              id: `${match.latitude}-${index}`,
              title: fmt.title,
              subtitle: fmt.subtitle,
              fullAddress: fmt.full,
              latitude: match.latitude,
              longitude: match.longitude,
            };
          } catch (e) {
            return null;
          }
        })
      );

      const valid = formatted.filter(Boolean) as LocationResult[];
      const unique = valid.filter(
        (v, i, a) => a.findIndex((t) => t.fullAddress === v.fullAddress) === i
      );

      setResults(unique);
      setShowDropdown(unique.length > 0);
    } catch (e) {
      // Silent fail
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View style={[styles.inputGroup, { zIndex: 100 }]}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
            {label}
          </Text>

          <View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderColor: error ? theme.error : theme.border,
                },
              ]}
              value={value}
              onChangeText={(text) => {
                onChange(text);
                // Trigger invalidation in parent
                if (onTextChange) onTextChange(text);
                // Debounce search
                if (text.length > 4) handleSearch(text);
              }}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              onFocus={() => {
                if (results.length > 0) setShowDropdown(true);
              }}
            />

            {isSearching && (
              <View style={styles.inputIconRight}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            )}
          </View>

          {showDropdown && results.length > 0 && (
            <View
              style={[
                styles.dropdown,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              {results.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: theme.border },
                  ]}
                  onPress={() => {
                    onChange(item.fullAddress);
                    setShowDropdown(false);
                    Keyboard.dismiss();
                    if (onSelect) {
                      onSelect({
                        address: item.fullAddress,
                        lat: item.latitude,
                        long: item.longitude,
                      });
                    }
                  }}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.primaryLight },
                    ]}
                  >
                    <Ionicons name="location" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropdownTitle, { color: theme.text }]}>
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.dropdownSubtitle,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

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

// --- 3. Horizontal Number Selector ---
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

// --- 4. Segmented Control ---
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

// --- 5. Chip Group ---
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

// --- 6. Switch ---
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

// --- 7. Submit Button ---
export function SubmitButton({ title, onPress, isPending, disabled }: any) {
  return (
    <Button
      title={title}
      onPress={onPress}
      isLoading={isPending}
      disabled={disabled}
      variant={disabled ? "secondary" : "primary"}
      style={{ marginTop: 24, opacity: disabled ? 0.6 : 1 }}
    />
  );
}

const styles = StyleSheet.create({
  inputGroup: { marginBottom: 16, position: "relative" },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  inputIconRight: {
    position: "absolute",
    right: 12,
    top: 14,
  },
  errorText: { fontSize: 12, marginTop: 4, marginLeft: 2 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  dropdownSubtitle: { fontSize: 13 },
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  numberText: { fontSize: 16, fontWeight: "600" },
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
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  selectChipText: { fontSize: 14, fontWeight: "500" },
  selectChipTextActive: { fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  switchLabel: { fontSize: 16 },
});
