import { Ionicons } from "@expo/vector-icons";
import { CardField } from "@stripe/stripe-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { PaymentMethodItem } from "@/features/payments/components/PaymentMethodItem";
import { RiderPaymentHistory } from "@/features/payments/components/RiderPaymentHistory";
import { useRiderPayments } from "@/features/payments/hooks/useRiderPayments";

export function RiderPaymentsScreen() {
  const { colors } = useTheme();
  const {
    methods,
    history,
    summary,
    isAddingCard,
    handleAddCard,
    deleteCard,
    setDefault,
    isActionPending,
    isLoading,
  } = useRiderPayments();

  const [showAdd, setShowAdd] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSavePress = (): void => {
    void (async () => {
      const success = await handleAddCard(cardComplete);
      if (success) setShowAdd(false);
    })();
  };

  if (isLoading) {
    return <Skeleton text="Loading Payments..." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="label" style={styles.sectionLabel}>
          Payment Methods
        </Text>

        {methods.length === 0 && !showAdd && (
          <Card style={styles.emptyCard}>
            <Text variant="body" color={colors.textSecondary} align="center">
              No payment methods saved. Add one to start hitching!
            </Text>
          </Card>
        )}

        {methods.map((method) => (
          <PaymentMethodItem
            key={method.id}
            method={method}
            isPending={isActionPending}
            onSetDefault={() => {
              setDefault(method.id);
            }}
            onDelete={() => {
              deleteCard(method.id);
            }}
          />
        ))}

        {showAdd ? (
          <Card style={styles.addCardContainer}>
            <Text variant="bodySemibold" style={{ marginBottom: 12 }}>
              Add New Card
            </Text>
            <CardField
              postalCodeEnabled={true}
              cardStyle={{
                backgroundColor: colors.surface,
                textColor: colors.text,
                placeholderColor: colors.textSecondary,
              }}
              style={styles.cardField}
              onCardChange={(d) => {
                setCardComplete(d.complete);
              }}
            />
            <View style={styles.row}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  setShowAdd(false);
                }}
              />
              <Button
                title="Save"
                style={{ flex: 1 }}
                onPress={handleSavePress}
                isLoading={isAddingCard}
                disabled={!cardComplete}
              />
            </View>
          </Card>
        ) : (
          <Button
            title="Add Payment Method"
            variant="secondary"
            onPress={() => {
              setShowAdd(true);
            }}
          />
        )}

        <View style={styles.securityBox}>
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={colors.textSecondary}
            style={{ marginRight: 8 }}
          />
          <Text variant="caption" color={colors.textSecondary}>
            Payments are securely encrypted.
          </Text>
        </View>

        <RiderPaymentHistory payments={history} summary={summary} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24, gap: 4 },
  sectionLabel: { marginBottom: 12, marginTop: 8 },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    marginBottom: 16,
    borderStyle: "dashed",
  },
  addCardContainer: { padding: 16, gap: 12 },
  cardField: { width: "100%", height: 50 },
  row: { flexDirection: "row", gap: 12, marginTop: 8 },
  securityBox: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
});
