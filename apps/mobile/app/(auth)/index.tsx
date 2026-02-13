import { Link } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/button";
import { useTheme } from "../../context/theme-context";

export default function LandingPage() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Welcome to Hitchly
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          McMaster&apos;s Ridesharing Platform
        </Text>

        <View style={styles.buttonContainer}>
          <Link href={"/(auth)/sign-in" as any} asChild>
            <Button title="Sign In" variant="primary" />
          </Link>

          <Link href={"/(auth)/sign-up" as any} asChild>
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
