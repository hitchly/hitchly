import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/theme-context";

interface ProfileHeroProps {
  name: string;
  email: string;
  rating: string;
  ratingCount: number;
  isVerified: boolean;
}

export function ProfileHero({
  name,
  email,
  rating,
  ratingCount,
  isVerified,
}: ProfileHeroProps) {
  const { colors } = useTheme();
  const initials = name.slice(0, 2).toUpperCase();

  const badge = isVerified
    ? {
        bg: colors.successBackground,
        text: colors.success,
        icon: "shield-checkmark" as const,
        label: "Verified Student",
      }
    : {
        bg: colors.warningBackground,
        text: colors.warning,
        icon: "alert-circle" as const,
        label: "Verification Pending",
      };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: colors.primary, shadowColor: colors.primary },
        ]}
      >
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
      <Text style={[styles.email, { color: colors.textSecondary }]}>
        {email}
      </Text>

      <View style={styles.row}>
        <View style={styles.rating}>
          <Ionicons name="star" size={16} color="#FFB300" />
          <Text style={[styles.ratingText, { color: colors.text }]}>
            {rating} {ratingCount > 0 ? `(${ratingCount.toString()})` : ""}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: badge.bg }]}>
          <Ionicons name={badge.icon} size={14} color={badge.text} />
          <Text style={[styles.pillText, { color: badge.text }]}>
            {badge.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 20 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
  },
  avatarText: { fontSize: 36, fontWeight: "bold", color: "#FFF" },
  name: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  email: { fontSize: 15, marginBottom: 12 },
  row: { flexDirection: "row", gap: 8 },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: { fontSize: 14, fontWeight: "600" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: "600" },
});
