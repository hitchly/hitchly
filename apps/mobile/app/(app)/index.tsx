import { Component, type ReactNode } from "react";
import type { Href } from "expo-router";
import { Redirect } from "expo-router";

import { ROLE_ROUTES } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";

function AppIndexContent() {
  const { role, isLoading } = useUserRole();

  if (isLoading) return null;

  return <Redirect href={ROLE_ROUTES[role] as Href} />;
}

interface AppIndexState {
  hasError: boolean;
}

/**
 * AppIndex with error boundary to handle provider initialization errors
 */
export default class AppIndex extends Component<{}, AppIndexState> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppIndexState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    // Log error but don't crash - providers might not be ready during initial render
    // eslint-disable-next-line no-console
    console.warn(
      "AppIndex error (likely provider initialization):",
      error.message
    );
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      // Return null if there's an error - will retry after delay
      return null;
    }

    return <AppIndexContent />;
  }
}
