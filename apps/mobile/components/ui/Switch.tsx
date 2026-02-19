import { StyleSheet, Switch, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

export interface SwitchRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchRow({
  label,
  value,
  onChange,
  disabled = false,
}: SwitchRowProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <Text
        variant="bodySemibold"
        color={disabled ? colors.textTertiary : colors.text}
      >
        {label}
      </Text>
      <Switch
        trackColor={{
          false: colors.border,
          true: colors.primaryLight,
        }}
        thumbColor={value ? colors.primary : colors.surfaceSecondary}
        ios_backgroundColor={colors.border}
        onValueChange={onChange}
        value={value}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    width: "100%",
  },
});
