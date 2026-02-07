import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SafetyScreen() {
  const router = useRouter();
  const { mode, tripId } = useLocalSearchParams<{
    mode?: "emergency" | "report";
    tripId?: string;
  }>();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("");
  const [reason, setReason] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Safety</Text>
          <View style={styles.backButton} />
        </View>

        <Text style={styles.title}>Safety & Reporting</Text>
        {tripId ? <Text style={styles.subtitle}>Trip ID: {tripId}</Text> : null}

        {/* Emergency Contact Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Emergency Contacts</Text>
          <Text style={styles.cardSubtitle}>
            Provide contact information for someone we can reach in an emergency.
          </Text>

          <Text style={styles.label}>Emergency Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Emergency Contact</Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            style={styles.input}
            placeholder="Name + phone"
          />

          <TouchableOpacity style={styles.primaryButton} disabled>
            <Text style={styles.primaryButtonText}>Save Contacts (next)</Text>
          </TouchableOpacity>
        </View>

        {/* Report Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Report an Issue</Text>
          <Text style={styles.cardSubtitle}>
            Tell us what we can help you with.
          </Text>

          <Text style={styles.label}>Details</Text>
          <TextInput
            placeholder="Describe the issue in detail..."
            value={reason}
            onChangeText={setReason}
            style={styles.textArea}
            multiline
          />

          <TouchableOpacity style={styles.primaryButton} disabled>
            <Text style={styles.primaryButtonText}>Submit Report (next)</Text>
          </TouchableOpacity>
        </View>

        {mode === "emergency" && (
          <Text style={styles.modeHint}>Focused: Emergency Contacts</Text>
        )}
        {mode === "report" && (
          <Text style={styles.modeHint}>Focused: Report an Issue</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 64,
    height: 32,
    justifyContent: "center",
  },
  backButtonText: { fontSize: 14, color: "#333" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  subtitle: { marginTop: 4, color: "#666" },
  card: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#111" },
  cardSubtitle: { marginTop: 6, marginBottom: 12, color: "#666" },
  label: { fontSize: 14, marginBottom: 6, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#7A003C",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    opacity: 0.6,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  modeHint: { marginTop: 12, color: "#7A003C" },
});
