import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/context/theme-context";
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: userProfile, isLoading: profileLoading } =
    trpc.profile.getMe.useQuery();

  useEffect(() => {
    if (profileLoading) return;

    const appRole = userProfile?.profile.appRole ?? "rider";
    const isDriver = appRole === "driver";

    if (isDriver) {
      router.replace("/requests" as Href);
    } else {
      router.replace("/matchmaking" as Href);
    }
  }, [userProfile, profileLoading, router]);

  if (profileLoading) {
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
