import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface ChipProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
}

export function Chip({ label, icon, active = false }: ChipProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: active
            ? `${colors.primary}15`
            : colors.surfaceSecondary,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.primary : colors.textSecondary}
          style={styles.icon}
        />
      )}
      <Text
        variant="caption"
        style={[
          styles.label,
          { color: active ? colors.primary : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontWeight: "600",
  },
});
