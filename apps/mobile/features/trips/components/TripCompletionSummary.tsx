import { formatCurrency, formatDuration } from "@hitchly/utils";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface TripCompletionSummaryData {
  durationMinutes?: number | null;
  totalEarningsCents?: number | null;
  passengerCount?: number | null;
  perPassenger?: {
    riderName?: string | null;
    amountCents?: number | null;
  }[];
  totalDistanceKm?: number | null;
}

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

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.scrollGap}
          >
            <View style={styles.row}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.value}>
                {formatDuration(summary?.durationMinutes)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Passengers</Text>
              <Text style={styles.value}>
                {summary?.passengerCount ?? "TBD"}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total Distance</Text>
              <Text style={styles.value}>
                {summary?.totalDistanceKm !== null &&
                summary?.totalDistanceKm !== undefined
                  ? `${summary.totalDistanceKm.toFixed(1)} km`
                  : "TBD"}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Earnings</Text>
              <Text style={styles.value}>
                {formatCurrency(summary?.totalEarningsCents)}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Per Passenger</Text>
              {(summary?.perPassenger?.length ?? 0) > 0 ? (
                summary?.perPassenger?.map((p, idx) => (
                  <View key={idx} style={styles.row}>
                    <Text style={styles.label}>
                      {p.riderName ?? "Passenger"}
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
  scrollGap: {
    gap: 12,
  },
  section: {
    gap: 8,
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
