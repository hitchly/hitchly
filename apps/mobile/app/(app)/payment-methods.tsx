// TODO: Fix linting issues and re-enable eslint for this file
/* eslint-disable */

import { Ionicons } from "@expo/vector-icons";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/context/theme-context";
import { trpc } from "@/lib/trpc";

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { confirmSetupIntent } = useStripe();

  const [showAddCard, setShowAddCard] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();

  const {
    data: paymentData,
    isLoading: methodsLoading,
    refetch,
  } = trpc.payment.getPaymentMethods.useQuery();

  const { data: paymentHistory, isLoading: historyLoading } =
    trpc.payment.getRiderPaymentHistory.useQuery();

  const createSetupIntent = trpc.payment.createSetupIntent.useMutation();

  const deletePaymentMethod = trpc.payment.deletePaymentMethod.useMutation({
    onSuccess: () => {
      utils.payment.getPaymentMethods.invalidate().catch(() => {
        /* Silently fail background refresh */
      });
      Alert.alert("Success", "Payment method removed");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const setDefaultPaymentMethod =
    trpc.payment.setDefaultPaymentMethod.useMutation({
      onSuccess: () => {
        utils.payment.getPaymentMethods.invalidate().catch(() => {
          /* Silently fail background refresh */
        });
        Alert.alert("Success", "Default payment method updated");
      },
      onError: (error) => {
        Alert.alert("Error", error.message);
      },
    });

  const handleSetDefault = (paymentMethodId: string, last4: string) => {
    Alert.alert(
      "Set as Default",
      `Set the card ending in ${last4} as your default payment method?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Set Default",
          onPress: () => {
            setDefaultPaymentMethod.mutate({ paymentMethodId });
          },
        },
      ]
    );
  };

  const handleAddCard = async () => {
    if (!cardComplete) {
      Alert.alert("Error", "Please complete the card details");
      return;
    }

    setIsLoading(true);

    try {
      // Get setup intent from backend
      const { clientSecret } = await createSetupIntent.mutateAsync();

      // Confirm the setup intent with Stripe
      const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      if (setupIntent?.status === "Succeeded") {
        Alert.alert("Success", "Card added successfully!");
        setShowAddCard(false);
        refetch();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to add card");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = (paymentMethodId: string, last4: string) => {
    Alert.alert(
      "Remove Card",
      `Are you sure you want to remove the card ending in ${last4}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            deletePaymentMethod.mutate({ paymentMethodId });
          },
        },
      ]
    );
  };

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case "visa":
        return "card";
      case "mastercard":
        return "card";
      case "amex":
        return "card";
      default:
        return "card-outline";
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Payment Methods List */}
        {methodsLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : paymentData?.methods && paymentData.methods.length > 0 ? (
          <View style={styles.cardList}>
            {paymentData.methods.map((method) => {
              const isDefault = method.isDefault;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.cardItem, isDefault && styles.cardItemDefault]}
                  onPress={() => {
                    if (!isDefault) {
                      handleSetDefault(method.id, method.last4);
                    }
                  }}
                  disabled={isDefault || setDefaultPaymentMethod.isPending}
                >
                  <View style={styles.cardInfo}>
                    {isDefault && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colors.primary}
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Ionicons
                      name={getCardIcon(method.brand)}
                      size={28}
                      color={isDefault ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.cardDetails}>
                      <View style={styles.cardBrandRow}>
                        <Text style={styles.cardBrand}>
                          {method.brand.charAt(0).toUpperCase() +
                            method.brand.slice(1)}
                        </Text>
                        {isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cardNumber}>•••• {method.last4}</Text>
                      {method.expMonth && method.expYear && (
                        <Text style={styles.cardExpiry}>
                          Expires {method.expMonth}/{method.expYear}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      handleDeleteCard(method.id, method.last4);
                    }}
                    style={styles.deleteButton}
                    disabled={deletePaymentMethod.isPending}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="card-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No payment methods added</Text>
            <Text style={styles.emptySubtext}>Add a card to request rides</Text>
          </View>
        )}

        {/* Add Card Section */}
        {showAddCard ? (
          <View style={styles.addCardForm}>
            <Text style={styles.sectionTitle}>Add New Card</Text>
            <CardField
              postalCodeEnabled={true}
              placeholders={{ number: "4242 4242 4242 4242" }}
              cardStyle={{
                backgroundColor: colors.surface,
                textColor: colors.text,
                placeholderColor: colors.textSecondary,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 8,
              }}
              style={styles.cardField}
              onCardChange={(details) => {
                setCardComplete(details.complete);
              }}
            />
            <View style={styles.addCardButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowAddCard(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  !cardComplete && styles.disabledButton,
                ]}
                onPress={handleAddCard}
                disabled={!cardComplete || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Card</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addCardButton}
            onPress={() => {
              setShowAddCard(true);
            }}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.addCardText}>Add Payment Method</Text>
          </TouchableOpacity>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons
            name="shield-checkmark"
            size={20}
            color={colors.textSecondary}
          />
          <Text style={styles.infoText}>
            Your payment info is securely stored with Stripe. We never see your
            full card number.
          </Text>
        </View>

        {/* Payment History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Payment History</Text>

          {historyLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : paymentHistory && paymentHistory.payments.length > 0 ? (
            <>
              {/* Summary Row */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryAmount}>
                    $
                    {(
                      (paymentHistory.summary.totalSpentCents || 0) / 100
                    ).toFixed(2)}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Spent</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text
                    style={[styles.summaryAmount, { color: colors.primary }]}
                  >
                    $
                    {(
                      (paymentHistory.summary.totalTipsCents || 0) / 100
                    ).toFixed(2)}
                  </Text>
                  <Text style={styles.summaryLabel}>Tips</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryAmount}>
                    {paymentHistory.summary.rideCount || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Rides</Text>
                </View>
              </View>

              {/* Payment List */}
              {paymentHistory.payments.slice(0, 10).map((payment) => (
                <View key={payment.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyIcon}>
                      <Ionicons name="car" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyDriver}>
                        {payment.driverName}
                      </Text>
                      <Text style={styles.historyRoute} numberOfLines={1}>
                        {payment.origin.split(",")[0]} →{" "}
                        {payment.destination.split(",")[0]}
                      </Text>
                      <Text style={styles.historyDate}>
                        {payment.capturedAt
                          ? new Date(payment.capturedAt).toLocaleDateString()
                          : new Date(
                              payment.departureTime
                            ).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>
                      ${(payment.amountCents / 100).toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        styles.historyStatus,
                        {
                          color:
                            payment.status === "captured"
                              ? colors.success
                              : colors.warning,
                        },
                      ]}
                    >
                      {payment.status === "captured" ? "Paid" : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.historyEmpty}>
              <Ionicons
                name="receipt-outline"
                size={40}
                color={colors.textSecondary}
              />
              <Text style={styles.historyEmptyText}>No payments yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    cardList: {
      marginBottom: 16,
    },
    cardItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardItemDefault: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    cardBrandRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    defaultBadge: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    defaultBadgeText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.primary,
    },
    cardInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    cardDetails: {
      marginLeft: 12,
    },
    cardBrand: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    cardNumber: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardExpiry: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    deleteButton: {
      padding: 8,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    addCardButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: "dashed",
    },
    addCardText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.primary,
      marginLeft: 8,
    },
    addCardForm: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    cardField: {
      width: "100%",
      height: 50,
      marginBottom: 16,
    },
    addCardButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    button: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    cancelButtonText: {
      color: colors.text,
      fontWeight: "500",
    },
    saveButton: {
      backgroundColor: colors.primary,
      marginLeft: 8,
    },
    saveButtonText: {
      color: "#fff",
      fontWeight: "600",
    },
    disabledButton: {
      opacity: 0.5,
    },
    infoSection: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      marginTop: 24,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 8,
      lineHeight: 18,
    },
    historySection: {
      marginTop: 24,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    summaryItem: {
      alignItems: "center",
      flex: 1,
    },
    summaryAmount: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    summaryLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    historyItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: 10,
      marginBottom: 8,
    },
    historyLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    historyIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryLight || `${colors.primary}20`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    historyInfo: {
      flex: 1,
    },
    historyDriver: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    historyRoute: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    historyDate: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    historyRight: {
      alignItems: "flex-end",
    },
    historyAmount: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    historyStatus: {
      fontSize: 11,
      marginTop: 2,
    },
    historyEmpty: {
      alignItems: "center",
      paddingVertical: 32,
    },
    historyEmptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
    },
  });
