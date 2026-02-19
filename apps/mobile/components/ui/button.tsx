import type { ReactNode } from "react";
import type {
  StyleProp,
  TextStyle,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/context/theme-context";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: ReactNode;
}

export function Button({
  title,
  variant = "primary",
  isLoading = false,
  style,
  textStyle,
  disabled,
  onPress,
  leftIcon,
  ...props
}: ButtonProps) {
  const { colors, isDark } = useTheme();

  const variants = {
    primary: {
      container: {
        backgroundColor: colors.primary,
        borderWidth: 0,
      },
      text: { color: isDark ? colors.background : "#FFFFFF" },
      indicator: isDark ? colors.background : "#FFFFFF",
    },
    secondary: {
      container: {
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
      },
      text: { color: colors.text },
      indicator: colors.text,
    },
    ghost: {
      container: { backgroundColor: "transparent", borderWidth: 0 },
      text: { color: colors.primary },
      indicator: colors.primary,
    },
    danger: {
      container: { backgroundColor: colors.error, borderWidth: 0 },
      text: { color: "#FFFFFF" },
      indicator: "#FFFFFF",
    },
  };

  const currentVariant = variants[variant];
  const isDisabled = disabled ?? isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        currentVariant.container,
        isDisabled && {
          backgroundColor: colors.disabled,
          borderColor: colors.disabled,
        },
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.7}
      onPress={onPress}
      {...props}
    >
      {leftIcon && <View style={{ marginRight: 8 }}>{leftIcon}</View>}
      {isLoading ? (
        <ActivityIndicator color={currentVariant.indicator} />
      ) : (
        <Text
          style={[
            styles.text,
            currentVariant.text,
            isDisabled && { color: colors.disabledText },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minHeight: 52,
    width: "100%",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
