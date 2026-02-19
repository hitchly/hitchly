import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
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
      {label && (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((num: number) => {
          const isActive = value === num;

          return (
            <Pressable
              key={num}
              onPress={() => {
                onChange(num);
              }}
              style={({ pressed }) => [
                styles.numberBox,
                {
                  backgroundColor: isActive ? colors.text : colors.surface,
                  borderColor: isActive ? colors.text : colors.border,
                },
                hasError && { borderColor: colors.error },
                { transform: [{ scale: pressed ? 0.94 : 1 }] },
                pressed &&
                  !isActive && { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Text
                variant="h3"
                color={isActive ? colors.background : colors.textSecondary}
              >
                {num}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
    marginBottom: 12,
    marginLeft: 4,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  numberBox: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    marginTop: 8,
    marginLeft: 4,
  },
});
