import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Card } from "./Card";

import { useTheme } from "@/context/theme-context";

interface InfoCardProps {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
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
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

        {onEdit && (
          <TouchableOpacity
            onPress={onEdit}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={[styles.editBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="pencil" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {empty ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {emptyText ?? "No information provided."}
          </Text>
          {onEdit && (
            <TouchableOpacity onPress={onEdit}>
              <Text style={[styles.actionText, { color: colors.primary }]}>
                {actionLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View>{children}</View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardSpacing: { marginBottom: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: "700" },
  editBtn: {
    padding: 6,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
