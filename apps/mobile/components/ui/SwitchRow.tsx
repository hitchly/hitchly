import type { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { IconBox } from "@/components/ui/IconBox";
import { Switch } from "@/components/ui/Switch";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

export interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SwitchRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
  icon,
}: SwitchRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        {icon && (
          <IconBox
            name={icon}
            variant="subtle"
            size={18}
            style={styles.iconOverride}
          />
        )}

        <View style={styles.textContainer}>
          <Text
            variant="bodySemibold"
            color={disabled ? colors.textTertiary : colors.text}
          >
            {label}
          </Text>
          {description && (
            <Text variant="caption" color={colors.textSecondary}>
              {description}
            </Text>
          )}
        </View>
      </View>

      <Switch value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: "100%",
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  iconOverride: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    gap: 1,
  },
});
