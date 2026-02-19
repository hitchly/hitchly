import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

export interface ChipOption<T> {
  label: string;
  value: T;
}

export interface ChipGroupProps<T> {
  label?: string;
  error?: string;
  options: readonly ChipOption<T>[];
  value?: T;
  onChange: (value: T) => void;
}

export function ChipGroup<T extends string | number>({
  label,
  error,
  options,
  value,
  onChange,
}: ChipGroupProps<T>) {
  const { colors } = useTheme();
  const hasError = (error ?? "") !== "";

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}

      <View style={styles.chipGrid}>
        {options.map((option: ChipOption<T>) => {
          const isActive = value === option.value;

          return (
            <Pressable
              key={option.value.toString()}
              onPress={() => {
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.selectChip,
                {
                  backgroundColor: isActive ? colors.text : colors.surface,
                  borderColor: isActive ? colors.text : colors.border,
                },
                hasError && { borderColor: colors.error },
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
                pressed &&
                  !isActive && { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Text
                variant="bodySemibold"
                color={isActive ? colors.background : colors.textSecondary}
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
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  selectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    marginTop: 8,
    marginLeft: 4,
  },
});
