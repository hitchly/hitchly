import { Link } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/button";
import { useTheme } from "../../context/theme-context";

export default function LandingPage() {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        {/* Branding */}
        <Text style={[styles.title, { color: theme.text }]}>
          Welcome to Hitchly
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          McMaster&apos;s Ridesharing Platform
        </Text>

        {/* Actions */}
        <View style={styles.buttonContainer}>
          <Link href="/(auth)/sign-in" asChild>
            <Button title="Sign In" variant="primary" />
          </Link>

          <Link href="/(auth)/sign-up" asChild>
            <Button title="Create Account" variant="secondary" />
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 48,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
});
