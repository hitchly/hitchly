import { Ionicons } from "@expo/vector-icons";
import type { ReactElement } from "react";
import React from "react";
import type {
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

type IconName = keyof typeof Ionicons.glyphMap;
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends PressableProps {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: IconName | ReactElement;
  iconPosition?: "left" | "right";
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  isLoading = false,
  style,
  textStyle,
  disabled,
  onPress,
  icon,
  iconPosition = "left",
  ...props
}: ButtonProps) {
  const { colors } = useTheme();

  const sizeStyles: Record<
    ButtonSize,
    { container: ViewStyle; icon: number; gap: number }
  > = {
    sm: {
      container: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        minHeight: 32,
        borderRadius: 6,
      },
      icon: 14,
      gap: 6,
    },
    md: {
      container: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        minHeight: 44,
        borderRadius: 8,
      },
      icon: 18,
      gap: 8,
    },
    lg: {
      container: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        minHeight: 56,
        borderRadius: 10,
      },
      icon: 20,
      gap: 10,
    },
    icon: {
      container: {
        width: 44,
        height: 44,
        minHeight: 44,
        paddingHorizontal: 0,
        paddingVertical: 0,
        borderRadius: 8,
      },
      icon: 20,
      gap: 0,
    },
  };

  const variants = {
    primary: { bg: colors.text, text: colors.background, border: colors.text },
    secondary: { bg: colors.surface, text: colors.text, border: colors.border },
    ghost: {
      bg: "transparent",
      text: colors.textSecondary,
      border: "transparent",
    },
    danger: { bg: colors.error, text: "#FFFFFF", border: colors.error },
  };

  const currentVariant = variants[variant];
  const currentSize = sizeStyles[size];
  const isDisabled = disabled ?? isLoading;

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === "string") {
      return (
        <Ionicons
          name={icon}
          size={currentSize.icon}
          color={isDisabled ? colors.disabledText : currentVariant.text}
        />
      );
    }
    return icon;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        currentSize.container,
        {
          backgroundColor: currentVariant.bg,
          borderColor: currentVariant.border,
          borderWidth: 1,
        },
        isDisabled && {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
        pressed &&
          !isDisabled && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={isDisabled ? colors.disabledText : currentVariant.text}
        />
      ) : (
        <View style={[styles.content, { gap: currentSize.gap }]}>
          {icon && iconPosition === "left" && renderIcon()}

          {/* NEW: Only render Text if a title is provided */}
          {title ? (
            <Text
              variant={size === "sm" ? "captionSemibold" : "bodySemibold"}
              style={[
                { color: currentVariant.text },
                isDisabled && { color: colors.disabledText },
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : null}

          {icon && iconPosition === "right" && renderIcon()}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", width: "100%" },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
