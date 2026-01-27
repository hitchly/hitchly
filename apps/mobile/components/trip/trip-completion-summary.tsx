import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type TripCompletionSummaryData = {
  durationMinutes?: number | null;
  totalEarningsCents?: number | null;
  passengerCount?: number | null;
  perPassenger?: Array<{
    riderName?: string | null;
    amountCents?: number | null;
  }>;
  totalDistanceKm?: number | null;
};

const formatCurrency = (cents?: number | null) => {
  if (cents === null || cents === undefined) return "TBD";
  return `$${(cents / 100).toFixed(2)}`;
};

const formatDuration = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined) return "TBD";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min`;
  return `${h} hr ${m} min`;
};

export const TripCompletionSummary = ({
  visible,
  onClose,
  summary,
}: {
  visible: boolean;
  onClose: () => void;
  summary: TripCompletionSummaryData | null;
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Trip Completed</Text>

          <ScrollView style={styles.body} contentContainerStyle={{ gap: 12 }}>
            <View style={styles.row}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.value}>
                {formatDuration(summary?.durationMinutes)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Passengers</Text>
              <Text style={styles.value}>
                {summary?.passengerCount === null ||
                summary?.passengerCount === undefined
                  ? "TBD"
                  : summary.passengerCount}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total Distance</Text>
              <Text style={styles.value}>
                {summary?.totalDistanceKm === null ||
                summary?.totalDistanceKm === undefined
                  ? "TBD"
                  : `${summary.totalDistanceKm.toFixed(1)} km`}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Earnings</Text>
              <Text style={styles.value}>
                {formatCurrency(summary?.totalEarningsCents)}
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.sectionTitle}>Per Passenger</Text>
              {(summary?.perPassenger?.length || 0) > 0 ? (
                summary!.perPassenger!.map((p, idx) => (
                  <View key={idx} style={styles.row}>
                    <Text style={styles.label}>
                      {p.riderName || "Passenger"}
                    </Text>
                    <Text style={styles.value}>
                      {formatCurrency(p.amountCents)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>TBD</Text>
              )}
            </View>

            <Text style={styles.note}>Tips will appear 1 hour after.</Text>
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: "#333",
    flexShrink: 1,
  },
  value: {
    color: "#111",
    fontWeight: "600",
  },
  muted: {
    color: "#666",
  },
  note: {
    marginTop: 8,
    color: "#666",
    fontSize: 12,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
