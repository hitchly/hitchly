import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

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
    if (isDefault) return "checkmark-circle";

    const brand = method.brand.toLowerCase();
    if (brand === "visa" || brand === "mastercard" || brand === "amex") {
      return "card";
    }
    return "card-outline";
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isDefault ? colors.primary : colors.border,
          borderWidth: isDefault ? 2 : 1,
        },
      ]}
      onPress={onSetDefault}
      disabled={isDefault || isPending}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Ionicons
          name={getCardIcon()}
          size={24}
          color={isDefault ? colors.primary : colors.textSecondary}
        />
        <View style={styles.info}>
          <Text variant="bodySemibold">
            {method.brand.toUpperCase()} •••• {method.last4}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            Expires {method.expMonth}/{method.expYear}
          </Text>
        </View>
      </View>

      {!isDefault && (
        <TouchableOpacity onPress={onDelete} disabled={isPending} hitSlop={15}>
          <Ionicons
            name="trash-outline"
            size={20}
            color={isPending ? colors.disabled : colors.error}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  info: {
    gap: 2,
  },
});
