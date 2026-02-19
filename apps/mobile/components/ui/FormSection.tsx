import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {(title ?? description) && (
        <View style={styles.header}>
          {title && (
            <Text variant="label" color={colors.textSecondary}>
              {title}
            </Text>
          )}
          {description && (
            <Text variant="caption" color={colors.textTertiary}>
              {description}
            </Text>
          )}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    marginBottom: 12,
    gap: 4,
    paddingHorizontal: 4,
  },
  content: {
    gap: 16,
  },
});
