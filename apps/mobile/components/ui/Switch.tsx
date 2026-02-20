import { Platform, Switch as RNSwitch } from "react-native";

import { useTheme } from "@/context/theme-context";

interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Switch({ value, onChange, disabled = false }: SwitchProps) {
  const { colors } = useTheme();

  return (
    <RNSwitch
      trackColor={{
        false: colors.border,
        true: colors.text,
      }}
      thumbColor={
        Platform.OS === "ios"
          ? undefined
          : value
            ? colors.background
            : colors.surfaceSecondary
      }
      ios_backgroundColor={colors.border}
      onValueChange={onChange}
      value={value}
      disabled={disabled}
    />
  );
}
