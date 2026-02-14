// TODO: Fix eslint errors in this file and re-enable linting
/* eslint-disable */

import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export default function BannedScreen() {
  const router = useRouter();

  const { data } = trpc.profile.getBanStatus.useQuery();

  const handleLogout = () => {
    const performLogout = async () => {
      await authClient.signOut();
      router.replace("/(auth)/sign-in");
    };

    performLogout().catch(() => {
      // Sign out failed, fallback to login screen
      router.replace("/(auth)/sign-in");
    });
  };

  const handleSupport = () => {
    Linking.openURL("mailto:support@hitchly.com").catch(() => {
      // Failed to open mail app
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Ionicons name="lock-closed" size={80} color="#D00000" />

      <Text style={styles.title}>Account Suspended</Text>

      <Text style={styles.message}>
        Your account has been flagged for violating our community guidelines.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.reasonLabel}>Reason:</Text>
        <Text style={styles.infoText}>
          {data?.reason ?? "Excessive reports or policy violations."}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSupport}>
        <Text style={styles.buttonText}>Contact Support</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogout} style={styles.linkButton}>
        <Text style={styles.linkText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 24,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: "#FFF0F0",
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    width: "100%",
    alignItems: "center",
  },
  reasonLabel: {
    color: "#D00000",
    fontWeight: "bold",
    marginBottom: 4,
    fontSize: 12,
    textTransform: "uppercase",
  },
  infoText: {
    color: "#333",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#333",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  linkButton: { padding: 12 },
  linkText: { color: "#666", fontSize: 14 },
});
