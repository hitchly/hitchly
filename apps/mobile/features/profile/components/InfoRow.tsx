import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface InfoRowProps {
  label: string;
  value: string | number;
  fullWidth?: boolean;
  capitalize?: boolean;
}

export function InfoRow({
  label,
  value,
  fullWidth = false,
  capitalize = false,
}: InfoRowProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        fullWidth ? styles.fullWidth : styles.halfWidth,
      ]}
    >
      <Text variant="label" color={colors.textSecondary} style={styles.label}>
        {label}
      </Text>
      <Text
        variant="bodySemibold"
        color={colors.text}
        style={[capitalize && styles.capitalize]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  fullWidth: { width: "100%" },
  halfWidth: { width: "48%" },
  label: {
    marginBottom: 4,
  },
  capitalize: { textTransform: "capitalize" },
});
