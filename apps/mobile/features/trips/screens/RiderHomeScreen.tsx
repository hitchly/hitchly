import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SwipeDeck, TripCard } from "@/components/swipe";
import { Button } from "@/components/ui/Button";
import { IconBox } from "@/components/ui/IconBox";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { RideSearchForm } from "@/features/trips/components/RideSearchForm";
import { SwipeErrorBoundary } from "@/features/trips/components/SwipeErrorBoundary";
import { useRideMatchmaking } from "@/features/trips/hooks/useRideMatchmaking";

export function RiderHomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const {
    userProfile,
    profileLoading,
    isTestUser,
    searchParams,
    hasSearched,
    setHasSearched,
    isSearchingMatches,
    hasMatchesData,
    filteredMatches,
    formState,
    handlers,
  } = useRideMatchmaking();

  if (profileLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text
            variant="body"
            color={colors.textSecondary}
            style={styles.loadingText}
          >
            LOADING PROFILE...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!searchParams) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContent}>
          <IconBox
            name="location-outline"
            variant="subtle"
            size={32}
            style={styles.largeIcon}
          />
          <Text variant="h2" style={styles.emptyTitle}>
            LOCATION REQUIRED
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            align="center"
            style={styles.emptySubtitle}
          >
            Please set your default location in your profile to start finding
            rides to campus.
          </Text>
          <Button
            title="GO TO PROFILE"
            onPress={() => {
              router.push("/(app)/rider/account" as Href);
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasSearched) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <RideSearchForm
          userAddress={userProfile?.profile.defaultAddress}
          isTestUser={isTestUser}
          direction={formState.direction}
          setDirection={formState.setDirection}
          desiredDate={formState.desiredDate}
          setDesiredDate={formState.setDesiredDate}
          desiredArrivalTime={formState.desiredArrivalTime}
          setDesiredArrivalTime={formState.setDesiredArrivalTime}
          includeDummyMatches={formState.includeDummyMatches}
          setIncludeDummyMatches={formState.setIncludeDummyMatches}
          onSearch={() => {
            setHasSearched(true);
          }}
        />
      </SafeAreaView>
    );
  }

  if (isSearchingMatches) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator
            size="large"
            color={colors.text}
            style={{ marginBottom: 20 }}
          />
          <Text variant="h3">SEARCHING...</Text>
          <Text variant="body" color={colors.textSecondary}>
            Finding your best ride to campus.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasMatchesData || filteredMatches.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centerContent}>
          <IconBox
            name="car-outline"
            variant="subtle"
            size={32}
            style={styles.largeIcon}
          />
          <Text variant="h2" style={styles.emptyTitle}>
            NO MATCHES FOUND
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            align="center"
            style={styles.emptySubtitle}
          >
            Try adjusting your time or check back later for new rides.
          </Text>
          <Button
            title="NEW SEARCH"
            variant="secondary"
            onPress={() => void handlers.resetSearch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.deckHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text variant="h2">SWIPE TO MATCH</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {filteredMatches.length} rides found for{" "}
            {formState.desiredArrivalTime}
          </Text>
        </View>
        <Button
          title="RESET"
          variant="ghost"
          size="sm"
          onPress={() => void handlers.resetSearch()}
        />
      </View>

      <View style={styles.swipeContainer}>
        <SwipeErrorBoundary
          onReset={() => {
            setHasSearched(false);
          }}
        >
          <SwipeDeck
            data={filteredMatches}
            renderCard={(match) => <TripCard match={match} />}
            onSwipeLeft={handlers.handleSwipeLeft}
            onSwipeRight={handlers.handleSwipeRight}
            onCardTap={(match) => {
              router.push(`/(app)/trips/${match.rideId}` as Href);
            }}
            onDeckEmpty={() => {
              /* empty */
            }}
          />
        </SwipeErrorBoundary>
      </View>

      <View style={styles.instructionsContainer}>
        <View style={styles.instructionRow}>
          <Ionicons
            name="close-circle"
            size={20}
            color={colors.textSecondary}
          />
          <Text variant="captionSemibold" color={colors.textSecondary}>
            SWIPE LEFT TO PASS
          </Text>
        </View>
        <View style={styles.instructionRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.text} />
          <Text variant="captionSemibold">SWIPE RIGHT TO REQUEST</Text>
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
    gap: 12,
  },
  loadingText: { marginTop: 8 },
  largeIcon: { width: 64, height: 64, borderRadius: 16, marginBottom: 8 },
  emptyTitle: { textAlign: "center", marginBottom: 4 },
  emptySubtitle: { marginBottom: 24, paddingHorizontal: 20 },
  deckHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
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
