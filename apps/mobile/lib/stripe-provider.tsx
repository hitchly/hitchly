import type { ReactNode } from "react";

import { isStripeAvailable } from "./stripe-utils";

// Note: The publishable key should be added to the mobile .env as:
// EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

interface StripeProviderWrapperProps {
  children: ReactNode;
}

// Lazy load StripeProvider to avoid native module errors in Expo Go
let StripeProviderComponent: any = null;

function getStripeProvider(): any {
  if (StripeProviderComponent !== null) {
    return StripeProviderComponent;
  }

  if (!isStripeAvailable()) {
    StripeProviderComponent = false; // Mark as checked, not available
    return null;
  }

  try {
    // require() is called at runtime here, not at module load time
    const stripeModule = require("@stripe/stripe-react-native");
    StripeProviderComponent = stripeModule.StripeProvider;
    return StripeProviderComponent;
  } catch (error) {
    // Stripe not available - mark as checked
    StripeProviderComponent = false;
    return null;
  }
}

/**
 * Wrapper component for Stripe React Native provider.
 * Enables card payments and Apple Pay/Google Pay.
 *
 * Note: Stripe doesn't work in Expo Go - it requires native modules.
 * This wrapper will skip Stripe initialization in Expo Go.
 */
export function StripeProviderWrapper({
  children,
}: StripeProviderWrapperProps): ReactNode {
  // Skip Stripe provider in Expo Go (doesn't support native modules)
  if (!isStripeAvailable()) {
    // eslint-disable-next-line no-console
    console.warn(
      "Stripe is not available in Expo Go. Payment features require a development build."
    );
    return <>{children}</>;
  }

  // Lazy load StripeProvider component
  const StripeProvider = getStripeProvider();

  if (!StripeProvider) {
    // Stripe not available - return children without StripeProvider
    return <>{children}</>;
  }

  if (!STRIPE_PUBLISHABLE_KEY) {
    // In development, show warning but don't crash
    // eslint-disable-next-line no-console
    console.warn(
      "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Payment features will not work."
    );
  }

  // Render StripeProvider
  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.hitchly" // Required for Apple Pay
    >
      <>{children}</>
    </StripeProvider>
  );
}
