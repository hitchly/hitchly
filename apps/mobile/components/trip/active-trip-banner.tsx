// TODO: fix linting issues and re-enable
/* eslint-disable*/

import { usePathname, useRouter } from "expo-router";
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
  const pathname = usePathname();

  const handlePress = () => {
    const currentPath = pathname || "/matchmaking";
    const referrer = currentPath.includes("/trips/")
      ? "/matchmaking"
      : currentPath;

    router.push({
      pathname: `/trips/${tripId}/${targetRoute}` as any,
      params: { referrer },
    });
  };

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
