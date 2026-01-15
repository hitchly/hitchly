import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Button,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

import { Card } from "../../components/ui/card";
import { useTheme } from "../../context/theme-context";
import { trpc } from "../../lib/trpc";
import { authClient } from "../../lib/auth-client";

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";

  const adminCheck = trpc.admin.amIAdmin.useQuery(undefined, {
    enabled: !!userId,
  });

  const { data, isLoading, error } = trpc.health.ping.useQuery();

  const isOnline = !!data && !error;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <Card>
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            System Status
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isOnline
                  ? colors.successBackground
                  : colors.errorBackground,
                borderColor: isOnline ? colors.success : colors.error,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? colors.success : colors.error },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isOnline ? colors.success : colors.error },
              ]}
            >
              {isLoading ? "Checking..." : isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        <View style={styles.statusContent}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : error ? (
            <View style={styles.messageRow}>
              <Ionicons name="warning-outline" size={20} color={colors.error} />
              <Text style={[styles.messageText, { color: colors.text }]}>
                {error.message}
              </Text>
            </View>
          ) : (
            <View style={styles.messageRow}>
              <Ionicons
                name="server-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.messageText, { color: colors.text }]}>
                Server says: &quot;{data?.message}&quot;
              </Text>
            </View>
          )}
        </View>
      </Card>

      {adminCheck.data?.isAdmin && (
        <View style={{ marginTop: 20 }}>
          <Link href={"/admin/dashboard" as any} asChild>
            <Button title="Go to Admin Dashboard" color={colors.primary} />
          </Link>
        </View>
      )}

      <Card style={styles.tripCard}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/trips")}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            View Trips
          </Text>
        </TouchableOpacity>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusContent: { paddingVertical: 8 },
  messageRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  messageText: { fontSize: 16, fontWeight: "500" },
  tripCard: { marginTop: 16 },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
