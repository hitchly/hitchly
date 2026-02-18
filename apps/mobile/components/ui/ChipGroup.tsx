import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <View style={styles.chipGrid}>
        {options.map((option: ChipOption<T>) => {
          const isActive = value === option.value;

          return (
            <TouchableOpacity
              key={option.value.toString()}
              activeOpacity={0.7}
              onPress={() => {
                onChange(option.value);
              }}
              style={[
                styles.selectChip,
                {
                  backgroundColor: isActive
                    ? colors.primaryLight
                    : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
                hasError ? { borderColor: colors.error } : null,
              ]}
            >
              <Text
                style={[
                  styles.selectChipText,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                  },
                  isActive ? styles.selectChipTextActive : null,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {hasError ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  selectChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  selectChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectChipTextActive: {
    fontWeight: "700",
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
    fontWeight: "500",
  },
});
