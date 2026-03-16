import { Component, type ReactNode } from "react";

interface StripeErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface StripeErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary specifically for Stripe initialization errors
 * Prevents Stripe errors from crashing the entire app
 */
export class StripeErrorBoundary extends Component<
  StripeErrorBoundaryProps,
  StripeErrorBoundaryState
> {
  constructor(props: StripeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): StripeErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    // Log error but don't crash the app
    // eslint-disable-next-line no-console
    console.warn("Stripe initialization error caught:", error.message);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
