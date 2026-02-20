import { Ionicons } from "@expo/vector-icons";
import { formatDate } from "@hitchly/utils";
import { useRouter } from "expo-router";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconBox } from "@/components/ui/IconBox";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useRiderTripRequests } from "@/features/trips/hooks/useRiderTripRequests";

const getBadgeVariant = (status: string) => {
  switch (status) {
    case "accepted":
      return "success";
    case "rejected":
      return "error";
    case "cancelled":
      return "info";
    default:
      return "default";
  }
};

export function RiderTripRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    requests,
    isLoading,
    isRefetching,
    refetch,
    cancelRequest,
    isCancelling,
  } = useRiderTripRequests();

  if (isLoading) return <Skeleton text="Loading Requests..." />;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Button
          size="icon"
          variant="ghost"
          icon="arrow-back"
          onPress={() => {
            router.back();
          }}
        />
        <Text variant="h2" style={styles.title}>
          MY REQUESTS
        </Text>
        <View style={styles.placeholder} />
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconBox
            name="document-text-outline"
            variant="subtle"
            size={32}
            style={styles.emptyIcon}
          />
          <Text variant="h2" style={styles.emptyTitle}>
            NO REQUESTS YET
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            align="center"
            style={styles.emptySubtext}
          >
            You haven&apos;t requested any rides yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.text}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item: request }) => {
            const trip = request.trip;
            return (
              <Card style={styles.requestCard}>
                <View style={styles.cardHeader}>
                  <Badge
                    label={request.status.toUpperCase()}
                    variant={getBadgeVariant(request.status)}
                  />
                  <Text variant="caption" color={colors.textSecondary}>
                    {formatDate(request.createdAt)}
                  </Text>
                </View>

                {trip && (
                  <View style={styles.tripInfo}>
                    <View style={styles.routeRow}>
                      <Text
                        variant="bodySemibold"
                        style={styles.routeText}
                        numberOfLines={1}
                      >
                        {trip.origin}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text
                        variant="bodySemibold"
                        style={styles.routeText}
                        numberOfLines={1}
                      >
                        {trip.destination}
                      </Text>
                    </View>
                    <Text variant="caption" color={colors.textSecondary}>
                      {formatDate(trip.departureTime)}
                    </Text>
                  </View>
                )}

                {(request.status === "pending" ||
                  request.status === "accepted") && (
                  <View style={styles.footerRow}>
                    <Button
                      title="CANCEL REQUEST"
                      variant="secondary"
                      onPress={() => {
                        Alert.alert(
                          "Cancel Request",
                          "Are you sure you want to cancel this request?",
                          [
                            { text: "No", style: "cancel" },
                            {
                              text: "Yes",
                              style: "destructive",
                              onPress: () => {
                                cancelRequest(request.id);
                              },
                            },
                          ]
                        );
                      }}
                      isLoading={isCancelling}
                      style={{ width: "100%" }}
                    />
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  placeholder: { width: 44, height: 44 },
  title: { letterSpacing: 0.5 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, marginBottom: 16 },
  emptyTitle: { marginBottom: 8 },
  emptySubtext: { lineHeight: 22 },
  listContent: { padding: 20, paddingTop: 8, gap: 16 },
  requestCard: { padding: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tripInfo: { marginBottom: 16, gap: 4 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeText: { flex: 1 },
  footerRow: { marginTop: 8 },
});
