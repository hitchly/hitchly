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
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: hasError ? colors.error : colors.border,
            borderWidth: 1,
          },
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
                { transform: [{ scale: pressed && !isActive ? 0.97 : 1 }] },
                pressed && !isActive && { opacity: 0.8 },
              ]}
            >
              <Text
                variant="bodySemibold"
                color={isActive ? colors.text : colors.textSecondary}
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
    marginBottom: 8,
    marginLeft: 4,
  },
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 4,
    height: 48,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  errorText: {
    marginTop: 6,
    marginLeft: 4,
  },
});
