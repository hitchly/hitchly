import type { ReactNode } from "react";

/**
 * This component replaces the native Stripe Provider on the web.
 * It prevents the bundler from trying to import native-only C++ modules,
 * which causes the "codegenNativeCommands" crash during 'expo export'.
 */
export function StripeProvider({ children }: { children: ReactNode }) {
  // If you ever need Web Payments, you would initialize @stripe/stripe-js here.
  // For now, we simply render the children to allow the app to build.
  return <>{children}</>;
}
