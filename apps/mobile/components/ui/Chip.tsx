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
          backgroundColor: active ? colors.text : colors.surfaceSecondary,
          borderColor: active ? colors.text : colors.border,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.background : colors.textSecondary}
          style={styles.icon}
        />
      )}
      <Text
        variant="captionSemibold"
        color={active ? colors.background : colors.textSecondary}
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
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  icon: {
    marginRight: 6,
  },
});
