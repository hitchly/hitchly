import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../context/theme-context";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, style }: CardProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]}>
      {children}
    </View>
  );
};

interface InfoCardProps {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
  empty?: boolean;
  emptyText?: string;
  actionLabel?: string;
}

export const InfoCard = ({
  title,
  onEdit,
  children,
  empty,
  emptyText,
  actionLabel = "Add Info",
}: InfoCardProps) => {
  const { colors } = useTheme();

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        {onEdit && (
          <TouchableOpacity
            onPress={onEdit}
            style={[styles.editIcon, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {empty ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {emptyText}
          </Text>
          {onEdit && (
            <TouchableOpacity onPress={onEdit}>
              <Text style={[styles.emptyLink, { color: colors.primary }]}>
                {actionLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.cardContent}>{children}</View>
      )}
    </Card>
  );
};

// --- Generic Info Row ---
interface InfoRowProps {
  label: string;
  value: string | number;
  fullWidth?: boolean;
  capitalize?: boolean;
}

export const InfoRow = ({
  label,
  value,
  fullWidth,
  capitalize,
}: InfoRowProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.infoItem, fullWidth && { width: "100%" }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.infoValue,
          { color: colors.text },
          capitalize && { textTransform: "capitalize" },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  editIcon: { padding: 6, borderRadius: 8 },
  cardContent: {},

  emptyState: { alignItems: "center", paddingVertical: 12 },
  emptyText: { fontSize: 14, marginBottom: 4 },
  emptyLink: { fontWeight: "600", fontSize: 14 },

  infoItem: { flex: 1 },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: { fontSize: 15, fontWeight: "500" },
});
