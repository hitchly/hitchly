import { StyleSheet, Text, View } from "react-native";

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
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          { color: colors.text },
          capitalize && styles.capitalize,
        ]}
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
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: { fontSize: 15, fontWeight: "500" },
  capitalize: { textTransform: "capitalize" },
});
