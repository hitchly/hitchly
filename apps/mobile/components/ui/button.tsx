import type { ReactNode } from "react";
import type {
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface ButtonProps extends PressableProps {
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
      text: isDark ? colors.background : "#FFFFFF",
      indicator: isDark ? colors.background : "#FFFFFF",
      pressed: { opacity: 0.85 },
    },
    secondary: {
      container: {
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
      },
      text: colors.text,
      indicator: colors.text,
      pressed: { backgroundColor: colors.border },
    },
    ghost: {
      container: { backgroundColor: "transparent", borderWidth: 0 },
      text: colors.primary,
      indicator: colors.primary,
      pressed: { backgroundColor: `${colors.primary}10` },
    },
    danger: {
      container: { backgroundColor: colors.error, borderWidth: 0 },
      text: "#FFFFFF",
      indicator: "#FFFFFF",
      pressed: { opacity: 0.85 },
    },
  };

  const currentVariant = variants[variant];
  const isDisabled = disabled ?? isLoading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        currentVariant.container,
        isDisabled && {
          backgroundColor: colors.disabled,
          borderColor: colors.disabled,
        },
        pressed && !isDisabled && currentVariant.pressed,
        style,
      ]}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={currentVariant.indicator} />
      ) : (
        <>
          {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
          <Text
            variant="bodySemibold"
            style={[
              { color: currentVariant.text },
              isDisabled && { color: colors.disabledText },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
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
  iconContainer: {
    marginRight: 8,
  },
});
