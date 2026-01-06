import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";

import { Colors } from "../constants/theme";
import { AppThemeProvider } from "../context/theme-context";
import { authClient } from "../lib/auth-client";
import { trpc, trpcClient } from "../lib/trpc";

const queryClient = new QueryClient();

const MyLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

function RootNavigator() {
  const { data: session, isPending } = authClient.useSession();
  const colorScheme = useColorScheme();
  const isAuthenticated = !!session;

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? MyDarkTheme : MyLightTheme}
    >
      <AppThemeProvider>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>

            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
          </Stack>

          {isPending && (
            <View
              style={[
                styles.loadingOverlay,
                { backgroundColor: colorScheme === "dark" ? "#000" : "#fff" },
              ]}
            >
              <ActivityIndicator
                size="large"
                color={Colors[colorScheme ?? "light"].primary}
              />
            </View>
          )}
        </View>
      </AppThemeProvider>
    </NavigationThemeProvider>
  );
}

export default function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});
