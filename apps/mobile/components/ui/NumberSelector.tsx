import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/context/theme-context";

export interface NumberSelectorProps {
  label?: string;
  error?: string;
  min: number;
  max: number;
  value?: number;
  onChange: (value: number) => void;
}

export function NumberSelector({
  label,
  error,
  min,
  max,
  value,
  onChange,
}: NumberSelectorProps) {
  const { colors } = useTheme();

  const options: number[] = Array.from(
    { length: max - min + 1 },
    (_: unknown, i: number): number => i + min
  );

  const hasError = (error ?? "") !== "";

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((num: number) => {
          const isActive = value === num;

          return (
            <TouchableOpacity
              key={num}
              activeOpacity={0.7}
              onPress={() => {
                onChange(num);
              }}
              style={[
                styles.numberCircle,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.background,
                  borderColor: isActive ? colors.primary : colors.border,
                },
                hasError ? { borderColor: colors.error } : null,
              ]}
            >
              <Text
                style={[
                  styles.numberText,
                  {
                    color: isActive ? colors.background : colors.textSecondary,
                  },
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
    marginBottom: 12,
    marginLeft: 4,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 4,
  },
  numberCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  numberText: {
    fontSize: 18,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
    fontWeight: "500",
  },
});
