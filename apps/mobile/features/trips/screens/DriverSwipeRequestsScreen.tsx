import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  RiderCard,
  SwipeDeck,
  type TripRequestWithDetails,
} from "@/components/swipe";
import { Button } from "@/components/ui/Button";
import { IconBox } from "@/components/ui/IconBox";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useDriverSwipeRequests } from "@/features/trips/hooks/useDriverSwipeRequests";

export function DriverSwipeRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const {
    driverTrips,
    allPendingRequests,
    isLoading,
    acceptRequest,
    rejectRequest,
  } = useDriverSwipeRequests();

  const handleSwipeRight = (request: TripRequestWithDetails) => {
    acceptRequest(request.id);
  };

  const handleSwipeLeft = (request: TripRequestWithDetails) => {
    rejectRequest(request.id);
  };

  const handleCardTap = (request: TripRequestWithDetails) => {
    Alert.alert(
      "REQUEST DETAILS",
      `Rider: ${request.rider?.name ?? request.rider?.email ?? "Unknown"}\nTrip: ${request.trip.origin} → ${request.trip.destination}`,
      [{ text: "OK" }]
    );
  };

  const handleDeckEmpty = () => {
    Alert.alert(
      "All Caught Up",
      "You've reviewed all pending requests. Check back later.",
      [
        {
          text: "Done",
          onPress: () => {
            router.back();
          },
        },
      ]
    );
  };

  // STATE 1: LOADING
  if (isLoading) {
    return <Skeleton text="Loading Requests..." />;
  }

  // STATE 2: NO ACTIVE TRIPS
  if (!driverTrips || driverTrips.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Button
            size="icon"
            variant="ghost"
            icon="close"
            onPress={() => {
              router.back();
            }}
          />
          <Text variant="h2" style={styles.title}>
            TRIP REQUESTS
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <IconBox
            name="car-outline"
            variant="subtle"
            size={32}
            style={styles.emptyIcon}
          />
          <Text variant="h2" style={styles.emptyTitle}>
            NO TRIPS FOUND
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            align="center"
            style={styles.emptySubtext}
          >
            Create a trip first to start receiving ride requests.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // STATE 3: NO PENDING REQUESTS
  if (allPendingRequests.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Button
            size="icon"
            variant="ghost"
            icon="close"
            onPress={() => {
              router.back();
            }}
          />
          <Text variant="h2" style={styles.title}>
            TRIP REQUESTS
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <IconBox
            name="checkmark-circle-outline"
            variant="subtle"
            size={32}
            style={styles.emptyIcon}
          />
          <Text variant="h2" style={styles.emptyTitle}>
            ALL CAUGHT UP
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
      </SafeAreaView>
    );
  }

  // STATE 4: SWIPE DECK
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Button
          size="icon"
          variant="ghost"
          icon="close"
          onPress={() => {
            router.back();
          }}
        />
        <Text variant="h2" style={styles.title}>
          REVIEW REQUESTS
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.swipeContainer}>
        <SwipeDeck
          data={allPendingRequests}
          renderCard={(request) => <RiderCard request={request} />}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onCardTap={handleCardTap}
          onDeckEmpty={handleDeckEmpty}
        />
      </View>

      <View style={styles.instructionsContainer}>
        <View style={styles.instructionRow}>
          <Ionicons name="close-circle" size={20} color={colors.error} />
          <Text variant="captionSemibold" color={colors.textSecondary}>
            SWIPE LEFT TO REJECT
          </Text>
        </View>
        <View style={styles.instructionRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text variant="captionSemibold">SWIPE RIGHT TO ACCEPT</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: { marginTop: 16, letterSpacing: 0.5 },

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

  swipeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },

  instructionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  instructionRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
