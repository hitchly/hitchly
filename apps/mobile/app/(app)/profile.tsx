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
            // The Root Layout is listening to useSession()
            // It will automatically redirect to (auth) when session becomes null
            console.log("Sign out successful");
          },
        },
      });
    } catch (err) {
      Alert.alert("Error", "Failed to sign out");
      setIsSigningOut(false);
    }
  };

  // Safe fallback if session is null (shouldn't happen on this screen due to protection)
  const user = session?.user;
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
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.image ? (
            // If you have an image URL in the future
            <Text>Image here</Text>
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>

        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.email}>{user?.email || "No email"}</Text>

        <View style={styles.badge}>
          {/* TODO: Add user role badge */}
          <Text style={styles.badgeText}>Student</Text>
        </View>
      </View>

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
    backgroundColor: "#007AFF",
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
  badge: {
    backgroundColor: "#e1ecf4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: "#007AFF", fontSize: 12, fontWeight: "600" },

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
