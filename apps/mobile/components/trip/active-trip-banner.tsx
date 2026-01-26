import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ActiveTripBannerProps {
  tripId: string;
  currentStop?: string;
}

export const ActiveTripBanner = ({
  tripId,
  currentStop,
}: ActiveTripBannerProps) => {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/trips/${tripId}/drive` as any);
  };

  return (
    <TouchableOpacity style={styles.banner} onPress={handlePress}>
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
    paddingVertical: 12,
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
