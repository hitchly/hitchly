import { Link, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Button,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";
import { trpc } from "../../lib/trpc";

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: userProfile, isLoading: profileLoading } =
    trpc.profile.getMe.useQuery();

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || "";

  const adminCheck = trpc.admin.amIAdmin.useQuery(undefined, {
    enabled: !!userId,
  });

  const { data, isLoading, error } = trpc.health.ping.useQuery();

  // Redirect to appropriate discover screen based on role
  useEffect(() => {
    if (profileLoading) return;

    const appRole = userProfile?.profile?.appRole || "rider";
    const isDriver = appRole === "driver";

    // Redirect to the appropriate discover screen
    if (isDriver) {
      router.replace("/requests" as any);
    } else {
      router.replace("/matchmaking" as any);
    }
  }, [userProfile, profileLoading, router]);

  if (profileLoading || adminCheck.isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Show admin dashboard link if user is admin (before redirect)
  // Note: This will briefly flash before redirect happens
  if (adminCheck.data?.isAdmin) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text, marginBottom: 20 }}>
            Health Check:{" "}
            {isLoading ? "Loading..." : data?.message || "Unknown"}
          </Text>
          {error && (
            <Text style={{ color: colors.error, marginBottom: 20 }}>
              Error: {error.message}
            </Text>
          )}
          <Link href={"/admin/dashboard" as any} asChild>
            <Button title="Go to Admin Dashboard" color={colors.primary} />
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  // This should not render as we redirect, but keep as fallback
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
