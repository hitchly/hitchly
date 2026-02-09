import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/theme-context";
import { trpc } from "../../lib/trpc";

const formatCurrency = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

export default function AdminDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "reports">("users");

  const {
    data: users,
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = trpc.admin.getAllUsers.useQuery();

  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = trpc.admin.getPlatformStats.useQuery();

  const {
    data: reports,
    isLoading: isLoadingReports,
    refetch: refetchReports,
  } = trpc.admin.getReports.useQuery();

  const isLoading = isLoadingUsers || isLoadingStats || isLoadingReports;

  const handleRefresh = () => {
    refetchUsers();
    refetchStats();
    refetchReports();
  };

  const banUserMutation = trpc.admin.banUser.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "User banned.");
      refetchUsers();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const unbanUserMutation = trpc.admin.unbanUser.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "User unbanned.");
      refetchUsers();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const handleBanToggle = (userId: string, isBanned: boolean) => {
    if (isBanned) {
      unbanUserMutation.mutate({ userId });
    } else {
      Alert.alert(
        "Ban User?",
        "Are you sure? They will be logged out immediately.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Ban",
            style: "destructive",
            onPress: () => banUserMutation.mutate({ userId }),
          },
        ]
      );
    }
  };

  // Filter Users
  const filteredUsers = users?.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatsHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: "#EEF2FF" }]}>
          <Text style={[styles.statLabel, { color: "#4F46E5" }]}>Users</Text>
          <Text style={[styles.statValue, { color: "#312E81" }]}>
            {stats?.totalUsers || 0}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#ECFDF5" }]}>
          <Text style={[styles.statLabel, { color: "#059669" }]}>Reports</Text>
          <Text style={[styles.statValue, { color: "#064E3B" }]}>
            {stats?.totalReports || 0}
          </Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
          <Text style={[styles.statLabel, { color: "#D97706" }]}>
            Completed Trips
          </Text>
          <Text style={[styles.statValue, { color: "#78350F" }]}>
            {stats?.completedTrips || 0}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#F3F4F6" }]}>
          <Text style={[styles.statLabel, { color: "#4B5563" }]}>Revenue</Text>
          <Text style={[styles.statValue, { color: "#1F2937" }]}>
            {formatCurrency(stats?.totalRevenue || 0)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderUserItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>
          {item.name || "No Name"}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {item.email}
        </Text>
        <View style={styles.badges}>
          <View
            style={[styles.badge, { backgroundColor: colors.primaryLight }]}
          >
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              {item.role || "user"}
            </Text>
          </View>
          {item.banned && (
            <View style={[styles.badge, { backgroundColor: "#FEE2E2" }]}>
              <Text style={[styles.badgeText, { color: "#DC2626" }]}>
                BANNED
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.actionBtn,
          { backgroundColor: item.banned ? colors.success : colors.error },
        ]}
        onPress={() => handleBanToggle(item.id, item.banned || false)}
      >
        <Ionicons
          name={item.banned ? "shield-checkmark" : "ban"}
          size={20}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );

  const renderReportItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.reportHeader}>
        <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
          <Text style={[styles.badgeText, { color: "#D97706" }]}>
            COMPLAINT
          </Text>
        </View>
        <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.reportContent}>
        <View style={styles.reportRow}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>
            Target:
          </Text>
          <Text style={[styles.reportValue, { color: colors.text }]}>
            {item.targetName} ({item.targetEmail})
          </Text>
        </View>
        <View style={styles.reportRow}>
          <Ionicons name="person" size={16} color={colors.primary} />
          <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>
            Reporter:
          </Text>
          <Text style={[styles.reportValue, { color: colors.text }]}>
            {item.reporterName}
          </Text>
        </View>
        {item.details && (
          <View
            style={[
              styles.detailsBox,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.reportDetails, { color: colors.text }]}>
              "{item.details}"
            </Text>
          </View>
        )}

        {/* Quick Action: Ban Target */}
        <TouchableOpacity
          style={[styles.banTargetBtn, { backgroundColor: colors.error }]}
          onPress={() => handleBanToggle(item.targetId, false)}
        >
          <Ionicons name="ban" size={16} color="white" />
          <Text style={styles.banTargetText}>Ban Target User</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Admin Dashboard
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={activeTab === "users" ? filteredUsers : reports}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === "users" ? renderUserItem : renderReportItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            {renderStatsHeader()}

            {/* TAB SWITCHER */}
            <View
              style={[styles.tabContainer, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "users" && { backgroundColor: colors.text },
                ]}
                onPress={() => setActiveTab("users")}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "users"
                          ? colors.background
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Users
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "reports" && { backgroundColor: colors.text },
                ]}
                onPress={() => setActiveTab("reports")}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "reports"
                          ? colors.background
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Reports
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "users" && (
              <View
                style={[styles.searchBar, { backgroundColor: colors.surface }]}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={colors.textSecondary}
                />
                <TextInput
                  placeholder="Search users..."
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {activeTab === "users" ? "No users found." : "No reports found."}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: "700" },
  backBtn: { padding: 8 },
  listContent: { padding: 16, gap: 12 },
  emptyText: { textAlign: "center", marginTop: 20, fontSize: 16 },

  // Stats
  statsContainer: { gap: 12, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 24, fontWeight: "800" },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabText: { fontWeight: "600", fontSize: 14 },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  input: { flex: 1, fontSize: 16 },

  // Card
  card: {
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // User Item
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700" },
  userEmail: { fontSize: 14, marginTop: 2 },
  badges: { flexDirection: "row", gap: 8, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 16,
    top: 16,
  },

  // Report Item
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timestamp: { fontSize: 12 },
  reportContent: { gap: 8 },
  reportRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reportLabel: { fontSize: 14, width: 70 },
  reportValue: { fontSize: 14, fontWeight: "600", flex: 1 },
  detailsBox: {
    marginTop: 4,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  reportDetails: { fontSize: 14, fontStyle: "italic" },
  banTargetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  banTargetText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
});
