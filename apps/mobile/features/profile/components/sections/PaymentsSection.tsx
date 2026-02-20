import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { IconBox } from "@/components/ui/IconBox";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

export function PaymentsSection() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Card style={styles.menuCard}>
      <Pressable
        style={({ pressed }) => [
          styles.menuItem,
          pressed && { backgroundColor: colors.surfaceSecondary },
        ]}
        onPress={() => {
          router.push("/(app)/rider/account/payments");
        }}
      >
        <View style={styles.menuLeft}>
          <IconBox name="wallet-outline" variant="subtle" />
          <Text variant="bodySemibold">Wallet & Payments</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textTertiary}
        />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  menuCard: { padding: 0, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
