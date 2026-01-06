import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/theme-context";

// --- Read-Only Chip ---
export const Chip = ({
  icon,
  label,
  active,
}: {
  icon: any;
  label: string;
  active: boolean;
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primaryLight : theme.surface,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? theme.primary : theme.textSecondary}
      />
      <Text
        style={[
          styles.chipText,
          { color: active ? theme.primary : theme.textSecondary },
          active && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

// --- Skeleton Loader ---
export const LoadingSkeleton = ({ text = "Loading..." }: { text?: string }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.skeletonContainer,
        {
          backgroundColor: theme.background,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
    >
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={{ marginTop: 16, color: theme.textSecondary }}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: { flex: 1 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, marginLeft: 6, fontWeight: "500" },
  chipTextActive: { fontWeight: "600" },
});
