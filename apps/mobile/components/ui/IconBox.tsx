import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/context/theme-context";

interface IconBoxProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  variant?: "default" | "subtle" | "contrast" | "error";
  style?: StyleProp<ViewStyle>;
}

export function IconBox({
  name,
  size = 20,
  color,
  variant = "default",
  style,
}: IconBoxProps) {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case "subtle":
        return {
          backgroundColor: colors.surfaceSecondary,
          iconColor: colors.textSecondary,
        };
      case "contrast":
        return {
          backgroundColor: colors.text,
          iconColor: colors.background,
        };
      case "error":
        return {
          backgroundColor: colors.errorBackground,
          iconColor: colors.error,
        };
      default:
        return {
          backgroundColor: colors.surfaceSecondary,
          iconColor: colors.text,
        };
    }
  };

  const config = getVariantStyles();

  return (
    <View
      style={[styles.box, { backgroundColor: config.backgroundColor }, style]}
    >
      <Ionicons name={name} size={size} color={color ?? config.iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
