import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface ProfileHeaderProps {
  name: string;
  email: string;
  rating: string;
  ratingCount: number;
  isVerified: boolean;
}

export function ProfileHeader({
  name,
  email,
  rating,
  ratingCount,
  isVerified,
}: ProfileHeaderProps) {
  const { colors } = useTheme();
  const initials = name.slice(0, 2).toUpperCase();

  const badge = isVerified
    ? {
        bg: colors.successBackground,
        text: colors.success,
        icon: "shield-checkmark" as const,
        label: "Verified",
      }
    : {
        bg: colors.warningBackground,
        text: colors.warning,
        icon: "alert-circle" as const,
        label: "Unverified",
      };

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text variant="h2" color="#FFF">
          {initials}
        </Text>
      </View>

      <View style={styles.info}>
        <Text variant="h2">{name}</Text>
        <Text
          variant="caption"
          color={colors.textSecondary}
          style={styles.email}
        >
          {email}
        </Text>

        <View style={styles.badges}>
          <View
            style={[
              styles.ratingPill,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text variant="caption" style={{ fontWeight: "600" }}>
              {rating} {ratingCount > 0 ? `(${String(ratingCount)})` : ""}
            </Text>
          </View>

          <View style={[styles.verifiedPill, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={12} color={badge.text} />
            <Text
              variant="caption"
              color={badge.text}
              style={{ fontWeight: "600" }}
            >
              {badge.label}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  email: {
    marginBottom: 8,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
