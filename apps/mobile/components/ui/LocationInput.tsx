import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import type {
  NativeSyntheticEvent,
  StyleProp,
  TargetedEvent,
  ViewStyle,
} from "react-native";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (_e: NativeSyntheticEvent<TargetedEvent>): void => {
    setIsFocused(true);
    if (results.length > 0) setShowDropdown(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = (_e: NativeSyntheticEvent<TargetedEvent>): void => {
    setIsFocused(false);
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const hasError = (error ?? "") !== "";
  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [hasError ? colors.error : colors.border, colors.primary],
  });

  return (
    <View
      style={[styles.container, { zIndex: showDropdown ? 1000 : 1 }, style]}
    >
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.background,
            borderColor: borderColor,
            borderWidth: isFocused ? 1.5 : 1,
          },
          hasError
            ? {
                backgroundColor: colors.errorBackground,
                borderColor: colors.error,
              }
            : null,
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            if (!showDropdown) setShowDropdown(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
        />
        {isSearching ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.loader}
          />
        ) : null}
      </Animated.View>

      {showDropdown && results.length > 0 ? (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {results.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.dropdownItem,
                { borderBottomColor: colors.border },
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
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons name="location" size={18} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.dropdownTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text
                  style={[
                    styles.dropdownSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {hasError ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: "100%", position: "relative" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  loader: { marginLeft: 8 },
  dropdown: {
    position: "absolute",
    top: 85, // Adjusted for label + input height
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  dropdownTitle: { fontSize: 15, fontWeight: "700" },
  dropdownSubtitle: { fontSize: 13, marginTop: 2 },
  errorText: { fontSize: 12, marginTop: 8, marginLeft: 4, fontWeight: "500" },
});
