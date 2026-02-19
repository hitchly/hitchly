import { Ionicons } from "@expo/vector-icons";
import type { ReactElement } from "react";
import React, { useState } from "react";
import type {
  NativeSyntheticEvent,
  TargetedEvent,
  TextInputProps,
} from "react-native";
import { StyleSheet, TextInput, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

type IconName = keyof typeof Ionicons.glyphMap;

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: IconName | ReactElement;
  iconPosition?: "left" | "right";
}

export function Input({
  label,
  error,
  helperText,
  icon,
  iconPosition = "left",
  style,
  onFocus,
  onBlur,
  value,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: NativeSyntheticEvent<TargetedEvent>): void => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TargetedEvent>): void => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === "string") {
      return (
        <Ionicons
          name={icon}
          size={18}
          color={isFocused ? colors.text : colors.textTertiary}
        />
      );
    }
    return icon;
  };

  const hasError = !!error;
  const borderColor = hasError
    ? colors.error
    : isFocused
      ? colors.text
      : colors.border;

  const paddingLeft = icon && iconPosition === "left" ? 44 : 12;
  const paddingRight = icon && iconPosition === "right" ? 44 : 12;

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}

      <View style={styles.wrapper}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: borderColor,
              borderWidth: isFocused || hasError ? 1.5 : 1,
              paddingLeft,
              paddingRight,
            },
            hasError && { backgroundColor: colors.errorBackground },
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={colors.text}
          autoCorrect={false}
          autoCapitalize="none"
          value={value}
          // THE FIX: When not focused, force the cursor to the start (0,0)
          // This forces the text engine to scroll back to the left.
          selection={!isFocused ? { start: 0, end: 0 } : undefined}
          {...props}
        />

        {icon && (
          <View
            style={[
              styles.iconContainer,
              iconPosition === "left" ? { left: 14 } : { right: 14 },
            ]}
            pointerEvents="none"
          >
            {renderIcon()}
          </View>
        )}
      </View>

      {(error ?? helperText) && (
        <Text
          variant="caption"
          color={hasError ? colors.error : colors.textTertiary}
          style={styles.helper}
        >
          {error ?? helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  label: { marginBottom: 8, marginLeft: 2, letterSpacing: 1 },
  wrapper: { justifyContent: "center", width: "100%" },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48,
    textAlign: "left",
  },
  iconContainer: {
    position: "absolute",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  helper: { marginTop: 6, marginLeft: 4 },
});
