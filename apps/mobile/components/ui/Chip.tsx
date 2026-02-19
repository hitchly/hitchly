import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

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
            ? colors.primaryLight
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
    marginRight: 4,
    marginBottom: 4,
  },
  icon: { marginRight: 6 },
  label: { fontSize: 13, fontWeight: "600" },
});
