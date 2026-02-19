import { StyleSheet, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
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

  return (
    <View style={styles.container}>
      <Avatar name={name} size={72} />

      <View style={styles.info}>
        <Text variant="h2" style={styles.name}>
          {name}
        </Text>
        <Text variant="body" color={colors.textSecondary} style={styles.email}>
          {email}
        </Text>

        <View style={styles.badges}>
          <Badge
            label={`${rating} ${ratingCount > 0 ? `(${String(ratingCount)})` : ""}`}
            icon="star"
            variant="default"
          />

          <Badge
            label={isVerified ? "Verified" : "Unverified"}
            icon={isVerified ? "shield-checkmark" : "alert-circle"}
            variant={isVerified ? "success" : "warning"}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 32,
    gap: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    letterSpacing: -0.5,
  },
  email: {
    marginBottom: 12,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
});
