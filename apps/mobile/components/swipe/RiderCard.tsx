import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/theme-context";

export type TripRequestWithDetails = {
  id: string;
  tripId: string;
  riderId: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: Date | string;
  updatedAt: Date | string;
  trip: {
    id: string;
    driverId: string;
    origin: string;
    destination: string;
    departureTime: Date | string;
    maxSeats: number;
    bookedSeats: number;
    status: string;
  };
  rider: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
};

interface RiderCardProps {
  request: TripRequestWithDetails;
}

export function RiderCard({ request }: RiderCardProps) {
  const { colors } = useTheme();

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const riderName =
    request.rider?.name || request.rider?.email || "Unknown Rider";
  const riderImage = request.rider?.image;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header with rider info */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {riderImage ? (
            <Image source={{ uri: riderImage }} style={styles.profileImage} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.avatarText}>
                {riderName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.riderName, { color: colors.text }]}>
              {riderName}
            </Text>
            <Text style={[styles.requestTime, { color: colors.textSecondary }]}>
              Requested {formatDate(request.createdAt)}
            </Text>
          </View>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.statusText, { color: colors.primary }]}>
            Pending
          </Text>
        </View>
      </View>

      {/* Trip route info */}
      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <View style={styles.routeLine} />
          <View style={[styles.routeDot, styles.routeDotDestination]} />
        </View>
        <View style={styles.routeTextContainer}>
          <Text
            style={[styles.routeText, { color: colors.text }]}
            numberOfLines={1}
          >
            {request.trip.origin}
          </Text>
          <Text
            style={[styles.routeText, { color: colors.text }]}
            numberOfLines={1}
          >
            {request.trip.destination}
          </Text>
        </View>
      </View>

      {/* Trip details */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Ionicons
            name="time-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Departure
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {formatTime(request.trip.departureTime)}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons
            name="person-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Seats Available
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {request.trip.maxSeats - request.trip.bookedSeats}
          </Text>
        </View>
      </View>

      {/* Additional info */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Ionicons
            name="mail-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {request.rider?.email}
          </Text>
        </View>
      </View>

      {/* Compatibility indicator (placeholder for future enhancement) */}
      <View style={styles.compatibilitySection}>
        <Ionicons
          name="checkmark-circle-outline"
          size={16}
          color={colors.success}
        />
        <Text
          style={[styles.compatibilityText, { color: colors.textSecondary }]}
        >
          McMaster student verified
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  profileInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  routeSection: {
    flexDirection: "row",
    marginBottom: 24,
    minHeight: 60,
  },
  routeRow: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    zIndex: 2,
  },
  routeDotDestination: {
    backgroundColor: "#ef4444",
    marginTop: "auto",
  },
  routeLine: {
    position: "absolute",
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: "#e5e7eb",
    zIndex: 1,
  },
  routeTextContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  routeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 16,
  },
  detailItem: {
    width: "45%",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  infoSection: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  compatibilitySection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  compatibilityText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
