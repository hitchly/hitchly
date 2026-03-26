import { Ionicons } from "@expo/vector-icons";
import { shortenAddress } from "@hitchly/utils";
import * as Location from "expo-location";
import { type Href, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormSection } from "@/components/ui/FormSection";
import { IconBox } from "@/components/ui/IconBox";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useRiderTripDetails } from "@/features/trips/hooks/useRiderTripDetails";
import {
  formatWeeklyCommuteLabel,
  isTripRecurring,
} from "@/features/trips/utils/recurringTripLabels";
import { openStopNavigation } from "@/lib/navigation";
import { trpc } from "@/lib/trpc";

const formatLocation = (loc: string) => shortenAddress(loc);
const formatAddressFromGeocode = (
  place: Location.LocationGeocodedAddress | null
) =>
  [
    place?.name && place.name !== place.street ? place.name : null,
    place?.street ?? null,
    place?.city ?? null,
  ]
    .filter((item): item is string => Boolean(item))
    .join(", ");

export function RiderTripDetailsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const utils = trpc.useUtils();
  const {
    trip,
    isLoading,
    userRequest,
    riderEtaDetails,
    liveDriver,
    cancelTripRequest,
    handleCancelRequest,
  } = useRiderTripDetails();

  const createRequestMutation = trpc.trip.createTripRequest.useMutation({
    onSuccess: async () => {
      if (!trip) return;
      await utils.trip.getTripById.invalidate({ tripId: trip.id });
      void utils.trip.getTripRequests.invalidate();
      void utils.trip.getTrips.invalidate();
      Alert.alert("Success", "Request for next ride sent.");
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const [pickupAddressByRequestId, setPickupAddressByRequestId] = useState<
    Record<string, string>
  >({});

  const routePickupRequests = useMemo(
    () =>
      (trip?.requests ?? []).filter((request) =>
        ["pending", "accepted", "on_trip", "completed"].includes(request.status)
      ),
    [trip?.requests]
  );

  useEffect(() => {
    let active = true;
    const requestsWithCoords = routePickupRequests.filter(
      (
        request
      ): request is typeof request & {
        pickupLat: number;
        pickupLng: number;
      } =>
        typeof request.pickupLat === "number" &&
        typeof request.pickupLng === "number"
    );

    if (requestsWithCoords.length === 0) {
      setPickupAddressByRequestId({});
      return () => {
        active = false;
      };
    }

    void (async () => {
      const entries = await Promise.all(
        requestsWithCoords.map(async (request) => {
          try {
            const [place] = await Location.reverseGeocodeAsync({
              latitude: request.pickupLat,
              longitude: request.pickupLng,
            });
            const address = formatAddressFromGeocode(place ?? null);
            const line = address !== "" ? address : "Pickup location";
            return [request.id, line] as const;
          } catch {
            return [request.id, "Pickup location"] as const;
          }
        })
      );

      // `active` can be false if the effect cleaned up while geocoding was in flight
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stale async guard
      if (!active) return;
      setPickupAddressByRequestId(Object.fromEntries(entries));
    })();

    return () => {
      active = false;
    };
  }, [routePickupRequests]);

  if (isLoading) return <Skeleton text="FETCHING TRIP..." />;

  if (!trip) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centered}>
          <IconBox name="warning" variant="subtle" size={32} />
          <Text variant="h3">TRIP NOT FOUND</Text>
          <Button
            title="GO BACK"
            variant="ghost"
            icon="arrow-back"
            onPress={() => {
              router.back();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const departureDate = trip.departureTime
    ? new Date(trip.departureTime)
    : null;
  const isPendingOrAccepted =
    userRequest?.status === "pending" || userRequest?.status === "accepted";

  const recurringMeta = isTripRecurring(trip)
    ? formatWeeklyCommuteLabel(trip.departureTime)
    : null;
  const routeStops =
    routePickupRequests.length > 0
      ? [
          ...routePickupRequests.map((request, index) => {
            const riderLabel =
              request.id === userRequest?.id
                ? "YOUR PICKUP"
                : request.rider?.name
                  ? `${request.rider.name.toUpperCase()} PICKUP`
                  : `PICKUP ${String(index + 1)}`;

            const pickupValue =
              request.pickupAddress ??
              pickupAddressByRequestId[request.id] ??
              "Pickup location";

            return {
              key: request.id,
              label: riderLabel,
              value: pickupValue,
            };
          }),
          {
            key: "dropoff",
            label: "DROP-OFF",
            value:
              userRequest?.dropoffLabel ?? formatLocation(trip.destination),
          },
        ]
      : [
          {
            key: "driver-origin",
            label: "PICKUP",
            value: formatLocation(trip.origin),
          },
          {
            key: "dropoff",
            label: "DROP-OFF",
            value:
              userRequest?.dropoffLabel ?? formatLocation(trip.destination),
          },
        ];

  const handleRideAgainNextWeek = async () => {
    if (!trip.recurringScheduleId || !trip.departureTime) {
      return;
    }
    if (!userRequest?.pickupLat || !userRequest.pickupLng) {
      Alert.alert(
        "Unavailable",
        "We couldn't find your original pickup location for this trip."
      );
      return;
    }

    const tripDepartureDate = new Date(trip.departureTime);
    if (Number.isNaN(tripDepartureDate.getTime())) {
      Alert.alert(
        "Unavailable",
        "Could not determine this trip's day of week."
      );
      return;
    }

    const next = await utils.recurringSchedule.getNextTripOccurrence.fetch({
      recurringScheduleId: trip.recurringScheduleId,
      after: tripDepartureDate,
      targetWeekday: tripDepartureDate.getDay(),
    });

    if (!next) {
      Alert.alert(
        "Not posted yet",
        "Next week's ride isn't posted yet. Please check back later."
      );
      return;
    }

    await createRequestMutation.mutateAsync({
      tripId: next.id,
      pickupLat: userRequest.pickupLat,
      pickupLng: userRequest.pickupLng,
    });
  };

  const handleOpenMaps = () => {
    if (!userRequest) return;

    if (userRequest.status === "accepted") {
      const liveLat = liveDriver.driverLocation?.latitude;
      const liveLng = liveDriver.driverLocation?.longitude;
      const targetLat = liveLat ?? trip.originLat;
      const targetLng = liveLng ?? trip.originLng;
      if (typeof targetLat === "number" && typeof targetLng === "number") {
        void openStopNavigation(targetLat, targetLng);
      } else {
        Alert.alert(
          "Location unavailable",
          "Map location is not available yet."
        );
      }
      return;
    }

    const dropoffLat = userRequest.dropoffLat ?? trip.destLat;
    const dropoffLng = userRequest.dropoffLng ?? trip.destLng;
    if (typeof dropoffLat === "number" && typeof dropoffLng === "number") {
      void openStopNavigation(dropoffLat, dropoffLng);
      return;
    }

    Alert.alert("Location unavailable", "Destination location is unavailable.");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header with Back & Status */}
        <View style={styles.headerRow}>
          <Badge
            label={
              userRequest
                ? `REQUEST: ${userRequest.status.toUpperCase()}`
                : trip.status.toUpperCase()
            }
            variant={
              userRequest?.status === "accepted" ? "success" : "secondary"
            }
          />
        </View>

        <FormSection title="ROUTE">
          <Card style={styles.cardPadding}>
            <View style={styles.routeRow}>
              <View style={styles.timeline}>
                {routeStops.map((stop, index) => (
                  <View key={stop.key} style={styles.timelineItem}>
                    <View
                      style={[
                        styles.dot,
                        index === routeStops.length - 1
                          ? [styles.dotOutline, { borderColor: colors.border }]
                          : { backgroundColor: colors.text },
                      ]}
                    />
                    {index < routeStops.length - 1 && (
                      <View
                        style={[
                          styles.line,
                          { backgroundColor: colors.border },
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>
              <View style={styles.locationContainer}>
                {routeStops.map((stop) => (
                  <View key={stop.key} style={styles.locationItem}>
                    <Text variant="label" color={colors.textSecondary}>
                      {stop.label}
                    </Text>
                    <Text variant="bodySemibold">{stop.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        </FormSection>

        {riderEtaDetails && (
          <FormSection title="LIVE UPDATE">
            <Card
              style={[
                styles.cardPadding,
                {
                  borderColor: colors.border,
                  borderLeftWidth: 4,
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <View style={styles.etaHeader}>
                <Ionicons name="flash" size={14} color={colors.primary} />
                <Text
                  variant="captionSemibold"
                  style={{ color: colors.primary }}
                >
                  {riderEtaDetails.title.toUpperCase()}
                </Text>
              </View>
              <Text variant="bodySemibold" style={styles.etaMessage}>
                {riderEtaDetails.message}
              </Text>
            </Card>
          </FormSection>
        )}

        <FormSection title="TRIP INFO">
          <Card style={styles.noPaddingCard}>
            <View style={styles.detailItem}>
              <Text variant="label" color={colors.textSecondary}>
                DEPARTURE
              </Text>
              <Text variant="bodySemibold">
                {departureDate
                  ?.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  })
                  .toUpperCase()}{" "}
                •{" "}
                {departureDate?.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
            <View style={styles.detailItem}>
              <Text variant="label" color={colors.textSecondary}>
                DRIVER
              </Text>
              <View style={styles.driverRow}>
                <Ionicons
                  name="person-circle"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text variant="bodySemibold">HITCHLY DRIVER</Text>
              </View>
            </View>
          </Card>
        </FormSection>

        {isTripRecurring(trip) && recurringMeta && (
          <FormSection title="RECURRING TRIP">
            <Card style={styles.cardPadding}>
              <Text variant="bodySemibold">🔁 {recurringMeta.title}</Text>
              <Text
                variant="body"
                color={colors.textSecondary}
                style={{ marginTop: 4 }}
              >
                {recurringMeta.subtitle}
              </Text>
              <Text
                variant="caption"
                color={colors.textSecondary}
                style={{ marginTop: 8 }}
              >
                You are requesting one occurrence at a time. Future weeks must
                be requested separately.
              </Text>
            </Card>
          </FormSection>
        )}

        {/* Improved Minimalist Actions */}
        <View style={styles.actionsContainer}>
          {(userRequest?.status === "accepted" ||
            userRequest?.status === "on_trip") &&
            trip.status === "in_progress" && (
              <Button
                title="ENTER LIVE PORTAL"
                icon="expand"
                size="lg"
                onPress={() => {
                  router.push(`/(app)/(modals)/ride?tripId=${trip.id}` as Href);
                }}
              />
            )}

          {riderEtaDetails &&
            (trip.status === "active" || trip.status === "in_progress") && (
              <View style={styles.safetyRow}>
                <Button
                  title="SAFETY"
                  variant="secondary"
                  icon="shield-checkmark"
                  style={styles.flex1}
                  onPress={() => {
                    router.push(
                      `/(app)/(modals)/safety?tripId=${trip.id}` as Href
                    );
                  }}
                />
                <Button
                  title="MAPS"
                  variant="secondary"
                  icon="navigate"
                  style={styles.flex1}
                  onPress={handleOpenMaps}
                />
              </View>
            )}

          {trip.status === "completed" && (
            <>
              <Button
                title="LEAVE REVIEW"
                variant="secondary"
                icon="star"
                onPress={() => {
                  router.push(`/(app)/(modals)/review/${trip.id}` as Href);
                }}
              />
              {isTripRecurring(trip) && (
                <Button
                  title={
                    recurringMeta
                      ? `REQUEST NEXT ${recurringMeta.subtitle.split(" ")[2]?.toUpperCase() ?? "WEEK"}`
                      : "REQUEST NEXT WEEK"
                  }
                  variant="ghost"
                  onPress={() => {
                    void handleRideAgainNextWeek();
                  }}
                  isLoading={createRequestMutation.isPending}
                  style={styles.rideAgainBtn}
                  textStyle={{ fontSize: 13 }}
                />
              )}
            </>
          )}

          {isPendingOrAccepted && (
            <Button
              title="CANCEL REQUEST"
              variant="ghost"
              isLoading={cancelTripRequest.isPending}
              onPress={handleCancelRequest}
              style={styles.cancelBtn}
              textStyle={{ color: colors.textSecondary, fontSize: 13 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  cardPadding: { padding: 20 },
  noPaddingCard: { padding: 0 },
  routeRow: { flexDirection: "row", gap: 20 },
  timeline: { width: 12, paddingVertical: 4 },
  timelineItem: { alignItems: "center", minHeight: 40 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOutline: { backgroundColor: "transparent", borderWidth: 1.5 },
  line: { width: 1, flex: 1, marginVertical: 4, minHeight: 16 },
  locationContainer: { flex: 1, gap: 24 },
  locationItem: { gap: 4 },
  etaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  etaMessage: { fontSize: 16 },
  detailItem: { padding: 16, gap: 4 },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  separator: { height: 1, width: "100%" },
  actionsContainer: { gap: 12, marginTop: 8 },
  safetyRow: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  cancelBtn: { marginTop: 8, opacity: 0.8 },
  rideAgainBtn: { marginTop: 8 },
});
