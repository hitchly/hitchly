import { CardField } from "@stripe/stripe-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormSection } from "@/components/ui/FormSection";
import { IconBox } from "@/components/ui/IconBox";
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

  const handleSavePress = async (): Promise<void> => {
    const success = await handleAddCard(cardComplete);
    if (success) setShowAdd(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        <Skeleton text="SYNCING WALLET..." />
      </View>
    );
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FormSection title="PAYMENT METHODS">
          {methods.length === 0 && !showAdd && (
            <Card style={styles.emptyCard}>
              <IconBox
                name="card-outline"
                variant="subtle"
                style={{ marginBottom: 12 }}
              />
              <Text variant="body" color={colors.textSecondary} align="center">
                No payment methods saved. Add one to start hitching!
              </Text>
            </Card>
          )}

          <View style={styles.methodList}>
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
          </View>

          {showAdd ? (
            <Card style={styles.addCardContainer}>
              <Text variant="bodySemibold" style={{ marginBottom: 4 }}>
                New Card Details
              </Text>
              <CardField
                postalCodeEnabled={true}
                cardStyle={{
                  backgroundColor: colors.surface,
                  textColor: colors.text,
                  placeholderColor: colors.textSecondary,
                  borderRadius: 8,
                }}
                style={styles.cardField}
                onCardChange={(d) => {
                  setCardComplete(d.complete);
                }}
              />
              <View style={styles.row}>
                <Button
                  title="CANCEL"
                  variant="ghost"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setShowAdd(false);
                  }}
                />
                <Button
                  title="SAVE CARD"
                  style={{ flex: 1 }}
                  onPress={() => void handleSavePress()}
                  isLoading={isAddingCard}
                  disabled={!cardComplete}
                />
              </View>
            </Card>
          ) : (
            <Button
              title="ADD PAYMENT METHOD"
              variant="secondary"
              icon="add-outline"
              onPress={() => {
                setShowAdd(true);
              }}
            />
          )}
        </FormSection>

        <View style={styles.securityBox}>
          <IconBox
            name="shield-checkmark"
            size={12}
            variant="subtle"
            style={styles.securityIcon}
          />
          <Text variant="caption" color={colors.textTertiary}>
            PAYMENTS ARE SECURELY ENCRYPTED VIA STRIPE
          </Text>
        </View>

        <View style={styles.divider} />

        <RiderPaymentHistory payments={history} summary={summary} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  content: { padding: 24, paddingBottom: 60 },
  methodList: { gap: 12, marginBottom: 12 },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    borderWidth: 1,
    marginBottom: 16,
  },
  addCardContainer: {
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  cardField: {
    width: "100%",
    height: 50,
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  securityBox: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  securityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 32,
    opacity: 0.5,
  },
});
