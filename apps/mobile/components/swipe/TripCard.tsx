import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/theme-context";

export type RideMatch = {
  rideId: string;
  driverId: string;
  name: string;
  profilePic: string;
  vehicle: string;
  rating: number;
  bio: string;
  matchPercentage: number;
  uiLabel: string;
  details: {
    estimatedCost: number;
    detourMinutes: number;
    arrivalAtPickup: string;
    availableSeats: number;
  };
  debugScores?: any;
};

interface TripCardProps {
  match: RideMatch;
}

export function TripCard({ match }: TripCardProps) {
  const { colors } = useTheme();

  const formatTime = (timeString: string) => {
    // If it's already formatted, return as is
    if (timeString.includes(":")) {
      return timeString;
    }
    // Otherwise try to parse as date
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

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
      {/* Header with driver info */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {match.profilePic ? (
            <Image
              source={{ uri: match.profilePic }}
              style={styles.profileImage}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.avatarText}>
                {match.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.driverName, { color: colors.text }]}>
              {match.name}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={[styles.rating, { color: colors.textSecondary }]}>
                {match.rating.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={[styles.matchBadge, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.matchPercentage, { color: colors.primary }]}>
            {match.matchPercentage}% Match
          </Text>
        </View>
      </View>

      {/* Route info */}
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
            {match.details.arrivalAtPickup || "Pickup location"}
          </Text>
          <Text
            style={[styles.routeText, { color: colors.text }]}
            numberOfLines={1}
          >
            McMaster University
          </Text>
        </View>
      </View>

      {/* Details grid */}
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
            {formatTime(match.details.arrivalAtPickup)}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons
            name="person-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Seats
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {match.details.availableSeats} left
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons
            name="cash-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Price
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            ${match.details.estimatedCost.toFixed(2)}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons
            name="navigate-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Detour
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {match.details.detourMinutes} min
          </Text>
        </View>
      </View>

      {/* Vehicle info */}
      <View style={styles.vehicleSection}>
        <Ionicons name="car-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.vehicleText, { color: colors.textSecondary }]}>
          {match.vehicle}
        </Text>
      </View>

      {/* Bio if available */}
      {match.bio && (
        <View style={styles.bioSection}>
          <Text style={[styles.bioText, { color: colors.textSecondary }]}>
            {match.bio}
          </Text>
        </View>
      )}

      {/* Compatibility tags */}
      {match.uiLabel && (
        <View style={styles.tagsContainer}>
          <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>
              {match.uiLabel}
            </Text>
          </View>
        </View>
      )}
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
  driverName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "500",
  },
  matchBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  matchPercentage: {
    fontSize: 14,
    fontWeight: "700",
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
  vehicleSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  bioSection: {
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
