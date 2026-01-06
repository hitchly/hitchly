import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../context/theme-context";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "ghost";
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  variant = "primary",
  isLoading = false,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  // Define styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          container: {
            backgroundColor: theme.primary,
            borderColor: theme.primary,
          },
          text: { color: "#fff" },
          indicator: "#fff",
        };
      case "secondary":
        return {
          container: {
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
          },
          text: { color: theme.text },
          indicator: theme.text,
        };
      case "ghost":
        return {
          container: { backgroundColor: "transparent" },
          text: { color: theme.primary },
          indicator: theme.primary,
        };
      default:
        return {
          container: { backgroundColor: theme.primary },
          text: { color: "#fff" },
          indicator: "#fff",
        };
    }
  };

  const stylesConfig = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        stylesConfig.container,
        disabled && { opacity: 0.5 },
        style,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={stylesConfig.indicator} />
      ) : (
        <Text style={[styles.text, stylesConfig.text]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    width: "100%",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
