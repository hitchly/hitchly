import { useState } from "react";
import { Alert } from "react-native";

import type { RouterOutputs } from "@/lib/trpc";
import { isStripeAvailable } from "@/lib/stripe-utils";
import { trpc } from "@/lib/trpc";

// Lazy load Stripe module to avoid native module errors in Expo Go
// Module is loaded at runtime via require(), not at module evaluation time
let stripeModuleCache: any = null;
let StripeSetupIntent: any = null;

function getStripeModule(): any {
  if (stripeModuleCache !== null) {
    return stripeModuleCache;
  }

  if (!isStripeAvailable()) {
    stripeModuleCache = false; // Mark as checked, not available
    return null;
  }

  try {
    // require() is called at runtime here, not at module load time
    stripeModuleCache = require("@stripe/stripe-react-native");
    StripeSetupIntent = stripeModuleCache?.SetupIntent;
    return stripeModuleCache;
  } catch (error) {
    // Stripe not available - mark as checked
    stripeModuleCache = false;
    return null;
  }
}

// Create a safe hook wrapper that always returns a function
// This allows us to call it unconditionally per React rules
function createSafeUseStripe() {
  return function useStripeSafe() {
    const module = getStripeModule();
    if (module?.useStripe) {
      try {
        return module.useStripe();
      } catch (error) {
        // StripeProvider not in tree
        return null;
      }
    }
    return null;
  };
}

const useStripeSafe = createSafeUseStripe();

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
  // Always call hook unconditionally (React rules)
  // This hook safely handles Stripe not being available
  const stripe = useStripeSafe();

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
    if (!isStripeAvailable() || !stripe) {
      Alert.alert(
        "Stripe Not Available",
        "Payment features require a development build. Stripe is not available in Expo Go."
      );
      return false;
    }

    if (!cardComplete) {
      Alert.alert("Error", "Please complete card details");
      return false;
    }

    setIsAddingCard(true);

    try {
      const { clientSecret } = await createSetupIntent.mutateAsync();

      const { error, setupIntent } = await stripe.confirmSetupIntent(
        clientSecret,
        {
          paymentMethodType: "Card",
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      // Check status - use string literal if SetupIntent isn't available
      const succeededStatus =
        StripeSetupIntent?.Status?.Succeeded ?? "Succeeded";
      if (setupIntent.status === succeededStatus) {
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
