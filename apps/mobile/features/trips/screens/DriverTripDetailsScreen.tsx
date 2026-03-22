import { Ionicons } from "@expo/vector-icons";
import { shortenAddress } from "@hitchly/utils";
import { type Href } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormSection } from "@/components/ui/FormSection";
import { IconBox } from "@/components/ui/IconBox";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useDriverTripDetails } from "@/features/trips/hooks/useDriverTripDetails";

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

export function DriverTripDetailsScreen() {
  const { colors } = useTheme();
  const {
    trip,
    isLoading,
    isDriver,
    recurringSchedule,
    cancelTrip,
    startTrip,
    deactivateSchedule,
    canStartRide,
    handleCancel,
    router,
  } = useDriverTripDetails();

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
      (request) =>
        request.pickupLat !== null &&
        request.pickupLat !== undefined &&
        request.pickupLng !== null &&
        request.pickupLng !== undefined
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
              latitude: request.pickupLat!,
              longitude: request.pickupLng!,
            });
            const address = formatAddressFromGeocode(place ?? null);
            return [request.id, address || "Pickup location"] as const;
          } catch {
            return [request.id, "Pickup location"] as const;
          }
        })
      );

      if (!active) return;
      setPickupAddressByRequestId(Object.fromEntries(entries));
    })();

    return () => {
      active = false;
    };
  }, [routePickupRequests]);

  if (isLoading) return <Skeleton text="LOADING TRIP DETAILS..." />;

  if (!trip || !isDriver) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.centered}>
          <IconBox name="warning" variant="subtle" size={32} />
          <Text variant="h3">TRIP NOT FOUND</Text>
          <Button
            title="RETURN TO DASHBOARD"
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

  const canCancel = trip.status === "pending" || trip.status === "active";
  const startRideInfo = trip.status === "active" ? canStartRide : null;
  const departureDate = trip.departureTime
    ? new Date(trip.departureTime)
    : null;
  const isRecurring = Boolean(trip.recurringScheduleId);
  const pendingRequestsCount = trip.requests.filter(
    (r) => r.status === "pending"
  ).length;

  const routeStops =
    routePickupRequests.length > 0
      ? [
          ...routePickupRequests.map((request, index) => {
            const riderNameUpper = request.rider?.name
              ? request.rider.name.toUpperCase()
              : null;
            const pickupLabel = riderNameUpper
              ? `${riderNameUpper} PICKUP`
              : `PICKUP ${String(index + 1)}`;
            return {
              key: request.id,
              label: pickupLabel,
              value:
                request.pickupAddress ||
                pickupAddressByRequestId[request.id] ||
                "Pickup location",
            };
          }),
          {
            key: "dropoff",
            label: "DROP-OFF",
            value: formatLocation(trip.destination),
          },
          ...routePickupRequests
            .map((request, index) => {
              const preferred = request.dropoffLabel?.trim();
              if (!preferred) return null;
              const riderNameUpper = request.rider?.name
                ? request.rider.name.toUpperCase()
                : null;
              const prefLabel = riderNameUpper
                ? `${riderNameUpper} — PREFERRED DROP-OFF`
                : `RIDER ${String(index + 1)} — PREFERRED DROP-OFF`;
              return {
                key: `${request.id}-preferred-dropoff`,
                label: prefLabel,
                value: preferred,
              };
            })
            .filter(
              (stop): stop is { key: string; label: string; value: string } =>
                stop !== null
            ),
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
            value: formatLocation(trip.destination),
          },
        ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Badge
            label={trip.status.toUpperCase()}
            variant={trip.status === "in_progress" ? "success" : "secondary"}
          />
        </View>

        <FormSection title="ROUTE">
          <Card style={styles.cardPadding}>
            <View style={styles.routeStopsList}>
              {routeStops.map((stop, index) => {
                const isLast = index === routeStops.length - 1;
                return (
                  <View
                    key={stop.key}
                    style={[
                      styles.routeStopRow,
                      isLast && styles.routeStopRowLast,
                    ]}
                  >
                    <View style={styles.routeStopGutter}>
                      <View
                        style={[
                          styles.routeDot,
                          isLast
                            ? [
                                styles.routeDotOutline,
                                { borderColor: colors.textSecondary },
                              ]
                            : { backgroundColor: colors.text },
                        ]}
                      />
                      {!isLast ? (
                        <View
                          style={[
                            styles.routeConnector,
                            { backgroundColor: colors.border },
                          ]}
                        />
                      ) : null}
                    </View>
                    <View style={styles.routeStopText}>
                      <Text variant="label" color={colors.textSecondary}>
                        {stop.label}
                      </Text>
                      <Text variant="bodySemibold">{stop.value}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </FormSection>

        {isRecurring && (
          <FormSection title="RECURRING TRIP">
            <Card style={styles.cardPadding}>
              <Text variant="bodySemibold">This is a recurring ride</Text>
              <Text
                variant="caption"
                color={colors.textSecondary}
                style={{ marginTop: 4 }}
              >
                When you cancel this trip, all future occurrences in this
                recurring series will also be cancelled.
              </Text>
              {recurringSchedule && (
                <View style={{ marginTop: 12, gap: 4 }}>
                  <Text variant="label" color={colors.textSecondary}>
                    SCHEDULE
                  </Text>
                  <View style={styles.weekdayRow}>
                    {[
                      {
                        label: "S",
                        key: "sunday",
                        on: recurringSchedule.sunday,
                      },
                      {
                        label: "M",
                        key: "monday",
                        on: recurringSchedule.monday,
                      },
                      {
                        label: "T",
                        key: "tuesday",
                        on: recurringSchedule.tuesday,
                      },
                      {
                        label: "W",
                        key: "wednesday",
                        on: recurringSchedule.wednesday,
                      },
                      {
                        label: "T",
                        key: "thursday",
                        on: recurringSchedule.thursday,
                      },
                      {
                        label: "F",
                        key: "friday",
                        on: recurringSchedule.friday,
                      },
                      {
                        label: "S",
                        key: "saturday",
                        on: recurringSchedule.saturday,
                      },
                    ].map((day) => (
                      <View
                        key={day.key}
                        style={[
                          styles.weekdayPill,
                          day.on && {
                            backgroundColor: colors.primary,
                          },
                        ]}
                      >
                        <Text
                          variant="captionSemibold"
                          style={{
                            color: day.on
                              ? colors.surface
                              : colors.textSecondary,
                          }}
                        >
                          {day.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text variant="caption" color={colors.textSecondary}>
                    Repeats at{" "}
                    {new Date(
                      new Date().setHours(
                        Math.floor(recurringSchedule.departureMinutes / 60),
                        recurringSchedule.departureMinutes % 60,
                        0,
                        0
                      )
                    ).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    .
                  </Text>
                </View>
              )}
            </Card>
          </FormSection>
        )}

        <FormSection title="TRIP DETAILS">
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
                CAPACITY
              </Text>
              <Text variant="bodySemibold">
                {trip.maxSeats - trip.bookedSeats} OF {trip.maxSeats} SEATS
                AVAILABLE
              </Text>
            </View>
          </Card>
        </FormSection>

        {trip.requests.length > 0 && (
          <FormSection title="PASSENGERS">
            <Card style={styles.noPaddingCard}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => {
                  router.push(
                    `/(app)/driver/trips/${trip.id}/requests` as Href
                  );
                }}
              >
                <View style={styles.menuLeft}>
                  <IconBox name="people-outline" variant="subtle" size={20} />
                  <Text variant="bodySemibold">
                    {trip.requests.length} Request
                    {trip.requests.length > 1 ? "s" : ""}
                  </Text>
                  {pendingRequestsCount > 0 && (
                    <Badge
                      label={`${String(pendingRequestsCount)} NEW`}
                      variant="info"
                    />
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </Pressable>
            </Card>
          </FormSection>
        )}

        <View style={styles.actionsContainer}>
          {startRideInfo && (
            <Button
              title={
                startRideInfo.canStart
                  ? "START LIVE TRIP"
                  : startRideInfo.availableAt
                    ? `STARTS AT ${startRideInfo.availableAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "WAITING FOR SCHEDULE"
              }
              icon={startRideInfo.canStart ? "play" : "time"}
              size="lg"
              onPress={() => {
                if (startRideInfo.canStart) {
                  Alert.alert("Start Trip", "Mark this trip as in progress?", [
                    { text: "CANCEL", style: "cancel" },
                    {
                      text: "START",
                      onPress: () => {
                        startTrip.mutate({ tripId: trip.id });
                      },
                    },
                  ]);
                }
              }}
              disabled={!startRideInfo.canStart || startTrip.isPending}
            />
          )}

          {trip.status === "in_progress" && (
            <Button
              title="RESUME NAVIGATION"
              icon="navigate"
              size="lg"
              onPress={() => {
                router.push(`/(app)/(modals)/drive?tripId=${trip.id}` as Href);
              }}
            />
          )}

          {trip.status === "completed" && (
            <>
              <Button
                title="RATE RIDERS"
                variant="secondary"
                icon="star"
                onPress={() => {
                  router.push(`/(app)/(modals)/review/${trip.id}` as Href);
                }}
              />
              {isRecurring && recurringSchedule && (
                <Button
                  title="CANCEL RECURRING SCHEDULE"
                  variant="ghost"
                  onPress={() => {
                    Alert.alert(
                      "Cancel recurring schedule",
                      "This will stop future rides for this recurring commute. Past trips stay in your history.",
                      [
                        { text: "KEEP SCHEDULE", style: "cancel" },
                        {
                          text: "STOP FUTURE RIDES",
                          style: "destructive",
                          onPress: () => {
                            deactivateSchedule.mutate({
                              id: recurringSchedule.id,
                            });
                          },
                        },
                      ]
                    );
                  }}
                  isLoading={deactivateSchedule.isPending}
                  style={styles.cancelRecurringBtn}
                  textStyle={{ fontSize: 13 }}
                />
              )}
            </>
          )}

          {canCancel && (
            <Button
              title="CANCEL TRIP"
              variant="ghost"
              onPress={handleCancel}
              isLoading={cancelTrip.isPending}
              style={styles.cancelBtn}
              textStyle={{ color: colors.error, fontSize: 13 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Base Layout
  container: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  header: { alignItems: "flex-start", marginBottom: -8 },

  // Card Spacing
  cardPadding: { padding: 20 },
  noPaddingCard: { padding: 0, overflow: "hidden" },

  // Route: one row per stop so dots align with that row’s text
  routeStopsList: { gap: 0 },
  routeStopRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
    paddingBottom: 18,
  },
  routeStopRowLast: {
    paddingBottom: 0,
  },
  routeStopGutter: {
    width: 14,
    alignItems: "center",
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 3,
  },
  routeDotOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  routeConnector: {
    width: 1,
    flex: 1,
    marginTop: 6,
    minHeight: 12,
  },
  routeStopText: {
    flex: 1,
    gap: 4,
    paddingRight: 4,
  },

  // List Rows
  detailItem: { padding: 16, gap: 4 },
  separator: { height: 1, width: "100%" },

  // Menu Item (Passengers)
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Actions
  actionsContainer: { gap: 12, marginTop: 8 },
  cancelBtn: { marginTop: 8, opacity: 0.8 },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 8,
  },
  weekdayPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
  },
  cancelRecurringBtn: {
    marginTop: 4,
    opacity: 0.9,
  },
});
