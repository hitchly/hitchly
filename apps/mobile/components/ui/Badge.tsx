import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface BadgeProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "contrast"
    | "outline";
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, icon, variant = "default", style }: BadgeProps) {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          bg: colors.successBackground,
          text: colors.success,
          border: "transparent",
        };
      case "warning":
        return {
          bg: colors.warningBackground,
          text: colors.warning,
          border: "transparent",
        };
      case "error":
        return {
          bg: colors.errorBackground,
          text: colors.error,
          border: "transparent",
        };
      case "info":
        return {
          bg: colors.infoBackground,
          text: colors.info,
          border: "transparent",
        };
      case "contrast":
        return {
          bg: colors.text,
          text: colors.background,
          border: "transparent",
        };
      case "outline":
        return {
          bg: "transparent",
          text: colors.textSecondary,
          border: colors.border,
        };
      case "secondary":
        return {
          bg: colors.surfaceSecondary,
          text: colors.textSecondary,
          border: "transparent",
        };
      default:
        return { bg: colors.border, text: colors.text, border: "transparent" };
    }
  };

  const theme = getVariantStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          borderWidth: variant === "outline" ? 1 : 0,
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={10} color={theme.text} />}
      <Text variant="captionSemibold" color={theme.text} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    alignSelf: "flex-start",
  },
  text: { textTransform: "uppercase", letterSpacing: 0.8, fontSize: 10 },
});
