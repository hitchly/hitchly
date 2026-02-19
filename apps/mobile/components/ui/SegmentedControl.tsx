import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

export interface SegmentOption<T> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T> {
  label?: string;
  error?: string;
  options: readonly SegmentOption<T>[];
  value?: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({
  label,
  error,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const hasError = (error ?? "") !== "";

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.segmentContainer,
          { backgroundColor: colors.surfaceSecondary },
          hasError && { borderColor: colors.error, borderWidth: 1 },
        ]}
      >
        {options.map((option: SegmentOption<T>) => {
          const isActive = value === option.value;

          return (
            <Pressable
              key={option.value.toString()}
              onPress={() => {
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.segmentBtn,
                isActive && [
                  styles.segmentBtnActive,
                  { backgroundColor: colors.surface },
                ],
                pressed && !isActive && { opacity: 0.7 },
              ]}
            >
              <Text
                variant="bodySemibold"
                color={isActive ? colors.primary : colors.textSecondary}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {hasError && (
        <Text variant="caption" color={colors.error} style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    marginBottom: 10,
    marginLeft: 4,
  },
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    height: 54,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    marginTop: 8,
    marginLeft: 4,
  },
});
