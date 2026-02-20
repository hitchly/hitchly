import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconBox } from "@/components/ui/IconBox";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import type { RouterOutputs } from "@/lib/trpc";

type PaymentMethod =
  RouterOutputs["payment"]["getPaymentMethods"]["methods"][number];

interface PaymentMethodItemProps {
  method: PaymentMethod;
  onSetDefault: () => void;
  onDelete: () => void;
  isPending: boolean;
}

export function PaymentMethodItem({
  method,
  onSetDefault,
  onDelete,
  isPending,
}: PaymentMethodItemProps) {
  const { colors } = useTheme();
  const isDefault = method.isDefault;

  const getCardIcon = (): keyof typeof Ionicons.glyphMap => {
    const brand = method.brand.toLowerCase();
    if (brand === "visa" || brand === "mastercard" || brand === "amex") {
      return "card";
    }
    return "card-outline";
  };

  return (
    <Card
      style={[
        styles.container,
        isDefault && { borderColor: colors.text, borderWidth: 1.5 },
      ]}
    >
      <Pressable
        style={styles.pressable}
        onPress={onSetDefault}
        disabled={isDefault || isPending}
      >
        <View style={styles.left}>
          <IconBox
            name={getCardIcon()}
            variant={isDefault ? "contrast" : "subtle"}
            size={20}
            style={styles.cardIcon}
          />
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text variant="bodySemibold">
                {method.brand.toUpperCase()} •••• {method.last4}
              </Text>
              {isDefault && (
                <Badge label="DEFAULT" variant="default" style={styles.badge} />
              )}
            </View>
            <Text variant="caption" color={colors.textSecondary}>
              EXPIRES {method.expMonth}/{method.expYear}
            </Text>
          </View>
        </View>

        {!isDefault && (
          <Pressable
            onPress={onDelete}
            disabled={isPending}
            hitSlop={15}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={isPending ? colors.disabledText : colors.error}
            />
          </Pressable>
        )}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0, // Let pressable handle inner padding for better hit box
    marginBottom: 12,
    overflow: "hidden",
  },
  pressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  info: {
    gap: 2,
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
});
