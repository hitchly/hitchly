import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";

import Ionicons from "@expo/vector-icons/Ionicons";
import { trpc } from "../../lib/trpc";
import { authClient } from "../../lib/auth-client";

export default function AdminDashboard() {
  const router = useRouter();

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";

  const statsQuery = trpc.admin.getAnalytics.useQuery(undefined, {
    enabled: !!userId,
  });

  const usersQuery = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: !!userId,
  });

  const warnMutation = trpc.admin.warnUser.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "User has been warned.");
      statsQuery.refetch();
      usersQuery.refetch();
    },
    onError: (err) => {
      Alert.alert("Error", err.message || "Failed to warn user.");
    },
  });

  function handleWarnUser(targetId: string, userName: string) {
    Alert.prompt(
      `Warn ${userName}?`,
      "Enter the reason for this warning. (3 warnings = Ban)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Issue Strike",
          style: "destructive",
          onPress: (reason?: string) => {
            if (!reason) return;
            warnMutation.mutate({
              targetUserId: targetId,
              reason: reason,
            });
          },
        },
      ]
    );
  }

  if (statsQuery.isLoading || usersQuery.isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (statsQuery.error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>
          Access Denied: You are not an admin.
        </Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: "blue" }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Super Admin Portal</Text>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>
            {statsQuery.data?.totalUsers || 0}
          </Text>
          <Text style={styles.cardLabel}>Users</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>
            {statsQuery.data?.activeUsers || 0}
          </Text>
          <Text style={styles.cardLabel}>Active</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>
            {statsQuery.data?.totalRides || 0}
          </Text>
          <Text style={styles.cardLabel}>Rides</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>User Management</Text>

      <FlatList
        data={usersQuery.data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text style={styles.userName}>{item.name || "Unknown"}</Text>

                {item.strikeCount > 0 && (
                  <Text
                    style={{
                      color: "#D00000",
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    ⚠️ {item.strikeCount}
                  </Text>
                )}
              </View>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>

            <TouchableOpacity
              style={styles.warnButton}
              onPress={() => handleWarnUser(item.id, item.name || "User")}
            >
              <Text style={styles.warnText}>Strike</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7", paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "red", fontSize: 16, fontWeight: "bold" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    width: "30%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardValue: { fontSize: 20, fontWeight: "bold", color: "#333" },
  cardLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  userName: { fontSize: 16, fontWeight: "600" },
  userEmail: { fontSize: 14, color: "#888" },
  warnButton: {
    backgroundColor: "#FFF0F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD0D0",
  },
  warnText: { color: "#D00000", fontWeight: "bold", fontSize: 12 },
});
