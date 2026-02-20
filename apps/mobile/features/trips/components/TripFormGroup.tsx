import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface TripFormGroupProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function TripFormGroup({ label, error, children }: TripFormGroupProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="label" color={colors.textSecondary} style={styles.label}>
        {label}
      </Text>
      {children}
      {error && (
        <Text variant="caption" color={colors.error} style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  error: {
    marginTop: 6,
  },
});
