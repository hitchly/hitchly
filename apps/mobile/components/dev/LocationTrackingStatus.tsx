import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as Location from "expo-location";
import { useEffect, useState } from "react";

import { useLocationTracking } from "@/context/location-context";
import { useTheme } from "@/context/theme-context";
import { useActiveTripMonitor } from "@/features/trips/hooks/useActiveTripMonitor";
import { useUserRole } from "@/context/role-context";

/**
 * Development component to display and test location tracking status.
 * This should only be used in development or debug builds.
 */
export function LocationTrackingStatus() {
  const { colors } = useTheme();
  const { role } = useUserRole();
  const { activeTripId, isActive, currentRoleLabel } = useActiveTripMonitor();
  const { isTracking, startBackgroundTracking, stopBackgroundTracking, error } =
    useLocationTracking();

  const [foregroundPermission, setForegroundPermission] =
    useState<string>("Checking...");
  const [backgroundPermission, setBackgroundPermission] =
    useState<string>("Checking...");

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const foreground = await Location.getForegroundPermissionsAsync();
        setForegroundPermission(foreground.status);

        const background = await Location.getBackgroundPermissionsAsync();
        setBackgroundPermission(background.status);
      } catch (err) {
        console.error("Failed to check permissions:", err);
        setForegroundPermission("error");
        setBackgroundPermission("error");
      }
    };

    checkPermissions();
  }, []);

  const handleStartTracking = async () => {
    const success = await startBackgroundTracking();
    if (success) {
      Alert.alert("Success", "Background tracking started successfully");
    } else {
      Alert.alert("Failed", error || "Could not start background tracking");
    }
  };

  const handleStopTracking = async () => {
    await stopBackgroundTracking();
    Alert.alert("Stopped", "Background tracking stopped");
  };

  const handleRefreshPermissions = async () => {
    const foreground = await Location.getForegroundPermissionsAsync();
    setForegroundPermission(foreground.status);

    const background = await Location.getBackgroundPermissionsAsync();
    setBackgroundPermission(background.status);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        📍 Location Tracking Debug
      </Text>

      {/* User Role & Active Trip */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          User Role:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {role || "Unknown"}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Active Trip:
        </Text>
        <Text
          style={[
            styles.value,
            { color: isActive ? colors.success : colors.text },
          ]}
        >
          {isActive ? `Yes (${currentRoleLabel})` : "No"}
        </Text>
      </View>

      {activeTripId && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Trip ID:
          </Text>
          <Text
            style={[
              styles.value,
              { color: colors.text, fontFamily: "monospace" },
            ]}
          >
            {activeTripId.slice(0, 8)}...
          </Text>
        </View>
      )}

      {/* Tracking Status */}
      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Tracking Status:
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isTracking ? colors.success : colors.error },
          ]}
        >
          <Text style={styles.statusText}>
            {isTracking ? "ACTIVE" : "INACTIVE"}
          </Text>
        </View>
      </View>

      {/* Permissions */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Foreground Permission:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {foregroundPermission}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Background Permission:
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {backgroundPermission}
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View
          style={[styles.errorBox, { backgroundColor: colors.error + "20" }]}
        >
          <Text style={[styles.errorText, { color: colors.error }]}>
            ⚠️ {error}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isTracking
                ? colors.textSecondary
                : colors.primary,
            },
          ]}
          onPress={handleStartTracking}
          disabled={isTracking}
        >
          <Text style={styles.buttonText}>Start Tracking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isTracking ? colors.error : colors.textSecondary,
            },
          ]}
          onPress={handleStopTracking}
          disabled={!isTracking}
        >
          <Text style={styles.buttonText}>Stop Tracking</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.refreshButton, { borderColor: colors.border }]}
        onPress={handleRefreshPermissions}
      >
        <Text style={[styles.refreshText, { color: colors.primary }]}>
          🔄 Refresh Permissions
        </Text>
      </TouchableOpacity>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          ℹ️ How It Works
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          • Tracking starts automatically for drivers with active trips{"\n"}•
          Background updates every 10s or 50m{"\n"}• Requires "Always" location
          permission on iOS{"\n"}• Requires "Allow all the time" on Android
          {"\n"}• Stops automatically when trip completes
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  refreshButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
