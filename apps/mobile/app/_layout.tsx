import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { NavTheme } from "@/constants/theme";
import { RoleProvider } from "@/context/role-context";
import { AppThemeProvider } from "@/context/theme-context";
import { RoleTransitionOverlay } from "@/features/profile/components/RoleTransitionOverlay";
import { authClient } from "@/lib/auth-client";
import { StripeProviderWrapper } from "@/lib/stripe-provider";
import { trpc, trpcClient } from "@/lib/trpc";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  const currentNavTheme = useMemo(
    () => (colorScheme === "dark" ? NavTheme.dark : NavTheme.light),
    [colorScheme]
  );

  useEffect(() => {
    if (isPending) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)");
      return;
    }

    if (session && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [session, isPending, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationThemeProvider value={currentNavTheme}>
        <AppThemeProvider>
          <View style={{ flex: 1 }}>
            {/* Context-aware UI components */}
            <RoleTransitionOverlay />
            {/* Main Navigation Stack */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </View>
        </AppThemeProvider>
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <StripeProviderWrapper>
            <AppContent />
          </StripeProviderWrapper>
        </RoleProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
