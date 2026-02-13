import { StripeProvider } from "@stripe/stripe-react-native";
import React from "react";

// Note: The publishable key should be added to the mobile .env as:
// EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

interface StripeProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component for Stripe React Native provider.
 * Enables card payments and Apple Pay/Google Pay.
 */
export function StripeProviderWrapper({
  children,
}: StripeProviderWrapperProps) {
  if (!STRIPE_PUBLISHABLE_KEY) {
    // In development, show warning but don't crash
    // eslint-disable-next-line no-console
    console.warn(
      "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Payment features will not work."
    );
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.hitchly" // Required for Apple Pay
    >
      <>{children}</>
    </StripeProvider>
  );
}
