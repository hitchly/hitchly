import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useRequests } from "@/features/requests/hooks/useRequests";

export function RequestsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    requests,
    isDriver,
    isLoading,
    acceptRequest,
    rejectRequest,
    isPendingAction,
  } = useRequests();

  if (isLoading) return <Skeleton text="Loading requests..." />;

  const handleCreateTrip = () => {
    router.push("/(app)/driver/trips/create");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              /* empty */
            }}
            tintColor={colors.primary}
          />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="mail-unread-outline"
                size={48}
                color={colors.textTertiary}
              />
            </View>
            <Text variant="h3" style={styles.emptyTitle}>
              No requests found
            </Text>
            <Text variant="body" color={colors.textSecondary} align="center">
              {isDriver
                ? "When people request to join your commute, they'll appear here."
                : "You haven't requested any rides to McMaster yet."}
            </Text>
            {isDriver && (
              <Button
                title="Post a Ride"
                onPress={handleCreateTrip}
                style={styles.emptyButton}
              />
            )}
          </View>
        ) : (
          requests.map((req) => {
            const riderName = req.rider?.name ?? "Unknown Rider";
            const displayName = isDriver ? riderName : "Upcoming Trip";
            const rawDate = req.trip?.departureTime;
            const formattedDate = rawDate
              ? new Date(rawDate).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "Time TBD";

            return (
              <View
                key={req.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.infoContainer}>
                    <Text variant="bodySemibold">{displayName}</Text>
                    <Text
                      variant="caption"
                      color={colors.textSecondary}
                      numberOfLines={1}
                    >
                      {req.trip?.origin ?? "Unknown"} →{" "}
                      {req.trip?.destination ?? "Unknown"}
                    </Text>
                  </View>
                  <Chip
                    label={req.status.toUpperCase()}
                    active={req.status === "pending"}
                  />
                </View>

                {isDriver && req.status === "pending" && (
                  <View style={styles.actionRow}>
                    <Button
                      title="Decline"
                      variant="secondary"
                      style={styles.actionButton}
                      disabled={isPendingAction}
                      onPress={() => {
                        rejectRequest({ requestId: req.id });
                      }}
                    />
                    <Button
                      title="Accept"
                      style={styles.actionButton}
                      isLoading={isPendingAction}
                      onPress={() => {
                        acceptRequest({ requestId: req.id });
                      }}
                    />
                  </View>
                )}

                {(!isDriver || req.status !== "pending") && (
                  <View style={styles.footer}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={colors.textTertiary}
                    />
                    <Text
                      variant="caption"
                      color={colors.textTertiary}
                      style={styles.footerText}
                    >
                      {formattedDate}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {isDriver && (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={handleCreateTrip}
        >
          <Ionicons name="add" size={36} color={colors.background} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerAction: { padding: 4 },
  listContent: { padding: 20, gap: 16, paddingBottom: 100 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  infoContainer: { flex: 1, marginRight: 8 },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  actionButton: { flex: 1, minHeight: 44 },
  footer: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  footerText: { marginLeft: 4 },
  emptyState: {
    flex: 1,
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyButton: { marginTop: 20, width: "auto", paddingHorizontal: 32 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: { marginBottom: 8 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
