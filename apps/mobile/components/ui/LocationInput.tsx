import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import type {
  NativeSyntheticEvent,
  StyleProp,
  TargetedEvent,
  ViewStyle,
} from "react-native";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

export interface LocationResult {
  id: string;
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
}

export interface LocationInputProps {
  label?: string;
  error?: string;
  value?: string;
  placeholder?: string;
  isSearching?: boolean;
  results: readonly LocationResult[];
  onChangeText: (text: string) => void;
  onSelect: (item: LocationResult) => void;
  style?: StyleProp<ViewStyle>;
}

export function LocationInput({
  label,
  error,
  value,
  placeholder,
  isSearching = false,
  results,
  onChangeText,
  onSelect,
  style,
}: LocationInputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleFocus = (_e: NativeSyntheticEvent<TargetedEvent>): void => {
    setIsFocused(true);
    if (results.length > 0) setShowDropdown(true);
  };

  const handleBlur = (_e: NativeSyntheticEvent<TargetedEvent>): void => {
    setIsFocused(false);
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  const hasError = (error ?? "") !== "";

  return (
    <View
      style={[styles.container, { zIndex: showDropdown ? 1000 : 1 }, style]}
    >
      {label && (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: hasError
              ? colors.error
              : isFocused
                ? colors.text
                : colors.border,
            borderWidth: hasError || isFocused ? 1.5 : 1,
          },
          hasError && { backgroundColor: colors.errorBackground },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            if (!showDropdown && text.length > 0) setShowDropdown(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching && (
          <ActivityIndicator
            size="small"
            color={colors.text}
            style={styles.loader}
          />
        )}
      </View>

      {showDropdown && results.length > 0 && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {results.map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.dropdownItem,
                index !== results.length - 1 && {
                  borderBottomColor: colors.divider,
                  borderBottomWidth: 1,
                },
                pressed && { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => {
                onSelect(item);
                setShowDropdown(false);
                Keyboard.dismiss();
              }}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={colors.text}
                />
              </View>
              <View style={styles.textContainer}>
                <Text variant="bodySemibold" color={colors.text}>
                  {item.title}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {hasError && (
        <Text variant="caption" color={colors.error} style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
    position: "relative",
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  loader: {
    marginLeft: 8,
  },
  dropdown: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  errorText: {
    marginTop: 8,
    marginLeft: 4,
  },
});
