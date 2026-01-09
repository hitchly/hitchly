import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/theme-context";

export const Chip = ({
  icon,
  label,
  active,
}: {
  icon: any;
  label: string;
  active: boolean;
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primaryLight : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[
          styles.chipText,
          { color: active ? colors.primary : colors.textSecondary },
          active && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export const LoadingSkeleton = ({ text = "Loading..." }: { text?: string }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.skeletonContainer,
        {
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 16, color: colors.textSecondary }}>{text}</Text>
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
