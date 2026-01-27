import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ActiveTripBannerProps {
  tripId: string;
  currentStop?: string;
  topInset?: number;
  targetRoute?: "drive" | "ride";
}

export const ActiveTripBanner = ({
  tripId,
  currentStop,
  topInset = 0,
  targetRoute = "drive",
}: ActiveTripBannerProps) => {
  const router = useRouter();

  const handlePress = () => {
    // Get current pathname to use as referrer
    const currentPath = window?.location?.pathname || "/matchmaking";
    const referrer = currentPath.includes("/trips/")
      ? "/matchmaking"
      : currentPath;

    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "components/trip/active-trip-banner.tsx:17",
        message: "Banner clicked",
        data: {
          tripId,
          navigatingTo: `/trips/${tripId}/${targetRoute}`,
          referrer,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run4",
        hypothesisId: "F",
      }),
    }).catch(() => {});
    // #endregion
    router.push({
      pathname: `/trips/${tripId}/${targetRoute}` as any,
      params: { referrer },
    });
  };

  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "components/trip/active-trip-banner.tsx:19",
      message: "Banner style values",
      data: {
        backgroundColor: styles.banner.backgroundColor,
        paddingVertical: styles.banner.paddingVertical,
        paddingTop: styles.banner.paddingTop,
        paddingBottom: styles.banner.paddingBottom,
        topInset,
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "post-fix",
      hypothesisId: "C",
    }),
  }).catch(() => {});
  // #endregion

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        { paddingTop: styles.banner.paddingTop + topInset },
      ]}
      onPress={handlePress}
    >
      <View style={styles.bannerContent}>
        <Text style={styles.bannerText}>Trip In Progress</Text>
        {currentStop && <Text style={styles.bannerSubtext}>{currentStop}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#007AFF",
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0051D5",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  bannerSubtext: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.9,
    marginLeft: 8,
  },
});
