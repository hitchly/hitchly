import { SetupIntent, useStripe } from "@stripe/stripe-react-native";
import { useState } from "react";
import { Alert } from "react-native";

import type { RouterOutputs } from "@/lib/trpc";
import { trpc } from "@/lib/trpc";

type PaymentMethod =
  RouterOutputs["payment"]["getPaymentMethods"]["methods"][number];
type PaymentHistoryItem =
  RouterOutputs["payment"]["getRiderPaymentHistory"]["payments"][number];
type PaymentSummary =
  RouterOutputs["payment"]["getRiderPaymentHistory"]["summary"];

interface UseRiderPaymentsReturn {
  methods: PaymentMethod[];
  history: PaymentHistoryItem[];
  summary: PaymentSummary | undefined;
  isLoading: boolean;
  isAddingCard: boolean;
  isActionPending: boolean;
  handleAddCard: (cardComplete: boolean) => Promise<boolean>;
  deleteCard: (id: string) => void;
  setDefault: (id: string) => void;
}

export function useRiderPayments(): UseRiderPaymentsReturn {
  const { confirmSetupIntent } = useStripe();
  const utils = trpc.useUtils();
  const [isAddingCard, setIsAddingCard] = useState(false);

  const { data: paymentData, isLoading: methodsLoading } =
    trpc.payment.getPaymentMethods.useQuery();

  const { data: paymentHistory, isLoading: historyLoading } =
    trpc.payment.getRiderPaymentHistory.useQuery();

  const createSetupIntent = trpc.payment.createSetupIntent.useMutation();

  const deleteMutation = trpc.payment.deletePaymentMethod.useMutation({
    onSuccess: () => {
      void utils.payment.getPaymentMethods.invalidate();
      Alert.alert("Success", "Payment method removed");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const setDefaultMutation = trpc.payment.setDefaultPaymentMethod.useMutation({
    onSuccess: () => {
      void utils.payment.getPaymentMethods.invalidate();
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleAddCard = async (cardComplete: boolean): Promise<boolean> => {
    if (!cardComplete) {
      Alert.alert("Error", "Please complete card details");
      return false;
    }

    setIsAddingCard(true);

    try {
      const { clientSecret } = await createSetupIntent.mutateAsync();

      const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent.status === SetupIntent.Status.Succeeded) {
        Alert.alert("Success", "Card added successfully!");
        void utils.payment.getPaymentMethods.invalidate();
        return true;
      }

      return false;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add card";
      Alert.alert("Error", message);
      return false;
    } finally {
      setIsAddingCard(false);
    }
  };

  return {
    methods: paymentData?.methods ?? [],
    history: paymentHistory?.payments ?? [],
    summary: paymentHistory?.summary,
    isLoading: methodsLoading || historyLoading,
    isAddingCard,
    handleAddCard,
    deleteCard: (id: string) => {
      deleteMutation.mutate({ paymentMethodId: id });
    },
    setDefault: (id: string) => {
      setDefaultMutation.mutate({ paymentMethodId: id });
    },
    isActionPending: deleteMutation.isPending || setDefaultMutation.isPending,
  };
}
