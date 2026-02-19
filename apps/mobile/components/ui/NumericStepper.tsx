import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

export interface NumericStepperProps {
  label?: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  error?: string;
}

export function NumericStepper({
  label,
  value,
  onValueChange,
  min = 0,
  max = 10,
  error,
}: NumericStepperProps) {
  const { colors } = useTheme();

  const increment = () => {
    if (value < max) {
      onValueChange(value + 1);
    }
  };

  const decrement = () => {
    if (value > min) {
      onValueChange(value - 1);
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.stepperWrapper,
          {
            borderColor: error ? colors.error : colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            decrement();
          }}
          disabled={value <= min}
          style={({ pressed }) => [
            styles.button,
            pressed && { backgroundColor: colors.surface },
            value <= min && { opacity: 0.5 },
          ]}
        >
          <Ionicons
            name="remove"
            size={24}
            color={value <= min ? colors.textTertiary : colors.primary}
          />
        </Pressable>

        <View style={styles.valueContainer}>
          <Text variant="bodySemibold">{value}</Text>
        </View>

        <Pressable
          onPress={() => {
            increment();
          }}
          disabled={value >= max}
          style={({ pressed }) => [
            styles.button,
            pressed && { backgroundColor: colors.surface },
            value >= max && { opacity: 0.5 },
          ]}
        >
          <Ionicons
            name="add"
            size={24}
            color={value >= max ? colors.textTertiary : colors.primary}
          />
        </Pressable>
      </View>
      {error && (
        <Text variant="caption" color={colors.error} style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: "100%" },
  label: { marginBottom: 8, marginLeft: 4 },
  stepperWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 52,
    overflow: "hidden",
  },
  button: {
    width: 52,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  valueContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  errorText: { marginTop: 6, marginLeft: 4 },
});
