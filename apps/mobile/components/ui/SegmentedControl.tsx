import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.segmentContainer,
          { backgroundColor: colors.surfaceSecondary },
          hasError ? { borderColor: colors.error, borderWidth: 1 } : null,
        ]}
      >
        {options.map((option: SegmentOption<T>) => {
          const isActive = value === option.value;

          return (
            <TouchableOpacity
              key={option.value.toString()}
              activeOpacity={0.8}
              onPress={() => {
                onChange(option.value);
              }}
              style={[
                styles.segmentBtn,
                isActive
                  ? [
                      styles.segmentBtnActive,
                      { backgroundColor: colors.surface },
                    ]
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                  },
                  isActive ? styles.segmentTextActive : null,
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
  segmentText: {
    fontSize: 15,
    fontWeight: "600",
  },
  segmentTextActive: {
    fontWeight: "700",
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
    fontWeight: "500",
  },
});
