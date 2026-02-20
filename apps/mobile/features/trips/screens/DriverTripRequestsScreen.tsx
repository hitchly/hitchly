import { Ionicons } from "@expo/vector-icons";
import { formatDate } from "@hitchly/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { useDriverTripRequests } from "@/features/trips/hooks/useDriverTripRequests";

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

export function DriverTripRequestsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const {
    requests,
    isLoading,
    isRefetching,
    refetch,
    acceptRequest,
    isAccepting,
    rejectRequest,
    isRejecting,
  } = useDriverTripRequests(tripId);

  // Check if there's actually anything to swipe
  const hasPendingRequests = requests.some((req) => req.status === "pending");

  if (isLoading) return <Skeleton text="Loading Requests..." />;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Text variant="h2" style={styles.title}>
          TRIP REQUESTS
        </Text>
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
            You&apos;ll see ride requests here when riders ask to join your
            trips.
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
          // Added bottom padding so the last item isn't hidden behind the floating button
          contentContainerStyle={styles.listContent}
          renderItem={({ item: request }) => {
            const trip = request.trip;
            const rider = request.rider;

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
                      {formatDate(trip.departureTime)} •{" "}
                      {trip.maxSeats - trip.bookedSeats} seats available
                    </Text>
                  </View>
                )}

                {rider && (
                  <View style={styles.userInfo}>
                    <IconBox name="person-outline" variant="subtle" size={16} />
                    <Text variant="bodySemibold" style={styles.userText}>
                      {rider.name || rider.email || "Unknown Rider"}
                    </Text>
                  </View>
                )}

                {request.status === "pending" && (
                  <View style={styles.footerRow}>
                    <View style={styles.actionRow}>
                      <Button
                        title="ACCEPT"
                        onPress={() => {
                          Alert.alert(
                            "Accept",
                            `Accept ${rider?.name ?? "this rider"}?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Accept",
                                onPress: () => {
                                  acceptRequest(request.id);
                                },
                              },
                            ]
                          );
                        }}
                        isLoading={isAccepting}
                        style={styles.actionButton}
                      />
                      <Button
                        title="REJECT"
                        variant="secondary"
                        onPress={() => {
                          Alert.alert(
                            "Reject",
                            `Reject ${rider?.name ?? "this rider"}?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Reject",
                                style: "destructive",
                                onPress: () => {
                                  rejectRequest(request.id);
                                },
                              },
                            ]
                          );
                        }}
                        isLoading={isRejecting}
                        style={styles.actionButton}
                      />
                    </View>
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}

      {/* FLOATING ACTION BUTTON (FAB) */}
      {hasPendingRequests && (
        <View style={styles.fabContainer}>
          <Button
            title="SWIPE TO REVIEW"
            icon="layers-outline"
            onPress={() => {
              router.push("/(app)/driver/requests/swipe");
            }}
            style={styles.fab}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
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
  listContent: {
    padding: 20,
    paddingTop: 8,
    gap: 16,
    paddingBottom: 100, // Important: Gives space so the last item scrolls above the FAB
  },
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
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 8,
  },
  userText: { flex: 1 },
  footerRow: { marginTop: 8 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionButton: { flex: 1 },

  // FAB Styles
  fabContainer: {
    position: "absolute",
    bottom: 24, // Sits comfortably above the tab bar
    alignSelf: "center", // Automatically centers it horizontally
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  fab: {
    borderRadius: 30, // Turns the standard button into a Vercel-style pill
    paddingHorizontal: 24,
  },
});
