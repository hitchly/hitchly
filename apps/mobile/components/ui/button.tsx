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
  ...props
}: ButtonProps) {
  const { colors } = useTheme();

  const variants = {
    primary: {
      container: { backgroundColor: colors.primary, borderWidth: 0 },
      text: { color: colors.text },
      indicator: colors.text,
    },
    secondary: {
      container: {
        backgroundColor: colors.surface,
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
      {...props}
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
