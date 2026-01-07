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
  disabled?: boolean;
  onPress?: () => void;
}

export function Button({
  title,
  variant = "primary",
  isLoading = false,
  style,
  disabled,
  onPress,
  ...props // 2. Capture all standard TouchableOpacity props (onPress, etc.)
}: ButtonProps) {
  const theme = useTheme();

  const variants = {
    primary: {
      container: { backgroundColor: theme.primary, borderWidth: 0 },
      text: { color: "#fff" },
      indicator: "#fff",
    },
    secondary: {
      container: {
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
      },
      text: { color: theme.text },
      indicator: theme.text,
    },
    ghost: {
      container: { backgroundColor: "transparent", borderWidth: 0 },
      text: { color: theme.primary },
      indicator: theme.primary,
    },
  };

  const currentVariant = variants[variant];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        currentVariant.container,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      onPress={onPress}
      {...props} // 3. Spread them here. This passes onPress to the component.
    >
      {isLoading ? (
        <ActivityIndicator color={currentVariant.indicator} />
      ) : (
        <Text style={[styles.text, currentVariant.text]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
