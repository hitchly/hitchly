import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { authClient } from "../../lib/auth-client";

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            console.log("Sign out successful");
          },
        },
      });
    } catch (err) {
      Alert.alert("Error", "Failed to sign out");
      setIsSigningOut(false);
    }
  };

  const user = session?.user;
  const isVerified = user?.emailVerified; // Check verification status

  // Generate initials for avatar
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.image ? (
            <Text>Image here</Text>
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>

        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.email}>{user?.email || "No email"}</Text>

        {/* Dynamic Verified Badge */}
        <View
          style={[
            styles.badge,
            isVerified ? styles.badgeSuccess : styles.badgeWarning,
          ]}
        >
          <Ionicons
            name={isVerified ? "checkmark-circle" : "alert-circle"}
            size={16}
            color={isVerified ? "#006400" : "#8B4500"}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.badgeText,
              isVerified ? styles.textSuccess : styles.textWarning,
            ]}
          >
            {isVerified ? "Verified Student" : "Not Verified"}
          </Text>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert("Edit", "Edit Profile logic here")}
        >
          <Ionicons name="pencil" size={20} color="#333" style={styles.icon} />
          <Text style={styles.actionText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={14} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert("Settings", "Settings logic here")}
        >
          <Ionicons
            name="settings"
            size={20}
            color="#333"
            style={styles.icon}
          />
          <Text style={styles.actionText}>Settings</Text>
          <Ionicons name="chevron-forward" size={14} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signOutText}>Sign Out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },

  // Header
  header: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#7A003C", // McMaster Maroon
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  avatarText: { fontSize: 36, fontWeight: "bold", color: "#fff" },
  name: { fontSize: 24, fontWeight: "700", color: "#333", marginBottom: 4 },
  email: { fontSize: 16, color: "#666", marginBottom: 12 },

  // Badges
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: "#e6f4ea", // Light Green
    borderColor: "#c6e7ce",
  },
  badgeWarning: {
    backgroundColor: "#fff3e0", // Light Orange
    borderColor: "#ffe0b2",
  },
  badgeText: { fontSize: 13, fontWeight: "600" },
  textSuccess: { color: "#006400" }, // Dark Green
  textWarning: { color: "#8B4500" }, // Dark Orange

  // Actions
  actionSection: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  icon: { width: 30 },
  actionText: { flex: 1, fontSize: 16, color: "#333" },

  // Sign Out
  signOutButton: {
    margin: 24,
    backgroundColor: "#ff3b30",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#ff3b30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  signOutText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
