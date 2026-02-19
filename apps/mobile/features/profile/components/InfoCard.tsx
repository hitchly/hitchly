import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface InfoCardProps {
  title: string;
  onEdit?: () => void;
  children: ReactNode;
  empty?: boolean;
  emptyText?: string;
  actionLabel?: string;
}

export function InfoCard({
  title,
  onEdit,
  children,
  empty = false,
  emptyText,
  actionLabel = "Add Info",
}: InfoCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.cardSpacing}>
      <View style={styles.header}>
        <Text variant="h3">{title}</Text>

        {onEdit && (
          <Pressable
            onPress={onEdit}
            hitSlop={8}
            style={({ pressed }) => [
              styles.editBtn,
              {
                backgroundColor: colors.surfaceSecondary,
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <Ionicons name="pencil" size={14} color={colors.text} />
          </Pressable>
        )}
      </View>

      {empty ? (
        <View style={styles.emptyContainer}>
          <Text
            variant="body"
            color={colors.textSecondary}
            style={styles.emptyText}
          >
            {emptyText ?? "No information provided."}
          </Text>
          {onEdit && (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text variant="bodySemibold" color={colors.primary}>
                {actionLabel}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View>{children}</View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardSpacing: { marginBottom: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  emptyText: {
    marginBottom: 8,
    textAlign: "center",
  },
});
