/* eslint-disable */
import type { CardFieldProps } from "@stripe/stripe-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { isStripeAvailable } from "@/lib/stripe-utils";

interface SafeCardFieldProps extends CardFieldProps {
  fallback?: ReactNode;
}

// Lazy load CardField to avoid importing native module in Expo Go
let CardField: any = null;

/**
 * Safe wrapper for Stripe CardField that handles Expo Go gracefully
 * In Expo Go, renders a fallback message instead of crashing
 */
export function SafeCardField(props: SafeCardFieldProps): ReactNode {
  const { colors } = useTheme();
  const { fallback, ...cardFieldProps } = props;

  // Don't render CardField in Expo Go
  if (!isStripeAvailable()) {
    return (
      fallback || (
        <View style={{ padding: 16, alignItems: "center" }}>
          <Text variant="body" color={colors.textSecondary} align="center">
            Card field not available in Expo Go
          </Text>
        </View>
      )
    );
  }

  // Lazy load CardField only when Stripe is available
  if (!CardField) {
    try {
      // Dynamic import to avoid loading native module in Expo Go
      const stripeModule = require("@stripe/stripe-react-native");
      CardField = stripeModule.CardField;
    } catch (error) {
      // Stripe not available - return fallback
      return (
        fallback || (
          <View style={{ padding: 16, alignItems: "center" }}>
            <Text variant="body" color={colors.textSecondary} align="center">
              Card field not available
            </Text>
          </View>
        )
      );
    }
  }

  // Render CardField - if it fails, the error boundary will catch it
  return <CardField {...cardFieldProps} />;
}
