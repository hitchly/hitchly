import Ionicons from "@expo/vector-icons/Ionicons";
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
import { Card } from "../../components/ui/card";
import { SAFETY_CONTACT } from "../../constants/safety";
import { useTheme } from "../../context/theme-context";

export default function SafetyScreen() {
  const { colors, fonts } = useTheme();
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={[styles.backButtonText, { color: colors.text }]}>
              Back
            </Text>
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color={colors.text} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Safety
            </Text>
          </View>
          <View style={styles.backButton} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Safety & Reporting
        </Text>
        {tripId ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Trip ID: {tripId}
          </Text>
        ) : null}

        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Contact Hitchly Emergency
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            For immediate assistance, please use these to contact our safety team.
          </Text>

          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, fontFamily: fonts.bold },
            ]}
          >
            Emergency Phone
          </Text>
          <Text style={[styles.contactValue, { color: colors.text }]}>
            {SAFETY_CONTACT.phone}
          </Text>

          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, fontFamily: fonts.bold },
            ]}
          >
            Emergency Email
          </Text>
          <Text style={[styles.contactValue, { color: colors.text }]}>
            {SAFETY_CONTACT.email}
          </Text>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Emergency Contacts
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Please provide the contact information for someone we can reach in an emergency.
          </Text>

          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, fontFamily: fonts.bold },
            ]}
          >
            Emergency Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
                fontFamily: fonts.regular,
              },
            ]}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@example.com"
            placeholderTextColor={colors.textSecondary}
          />

          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, fontFamily: fonts.bold },
            ]}
          >
            Phone
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
                fontFamily: fonts.regular,
              },
            ]}
            keyboardType="phone-pad"
            placeholder="(555) 123-4567"
            placeholderTextColor={colors.textSecondary}
          />

          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, fontFamily: fonts.bold },
            ]}
          >
            Emergency Contact Name
          </Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
                fontFamily: fonts.regular,
              },
            ]}
            placeholder="Full name"
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            disabled
          >
            <Text style={styles.primaryButtonText}>Save Contacts (next)</Text>
          </TouchableOpacity>
        </Card>

        {/* Report Form */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Report an Issue
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Tell us what we can help you with.
          </Text>

          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, fontFamily: fonts.bold },
            ]}
          >
            Details
          </Text>
          <TextInput
            placeholder="Describe the issue in detail..."
            value={reason}
            onChangeText={setReason}
            style={[
              styles.textArea,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
                fontFamily: fonts.regular,
              },
            ]}
            multiline
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            disabled
          >
            <Text style={styles.primaryButtonText}>Submit Report (next)</Text>
          </TouchableOpacity>
        </Card>

        {mode === "emergency" && (
          <Text style={[styles.modeHint, { color: colors.primary }]}>
            Focused: Emergency Contacts
          </Text>
        )}
        {mode === "report" && (
          <Text style={[styles.modeHint, { color: colors.primary }]}>
            Focused: Report an Issue
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backButton: {
    width: 64,
    height: 32,
    justifyContent: "center",
  },
  backButtonText: { fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4, paddingHorizontal: 16 },
  subtitle: { marginBottom: 8, paddingHorizontal: 16 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  cardSubtitle: { marginTop: 6, marginBottom: 12 },
  label: {
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  contactValue: { fontSize: 15, fontWeight: "600", marginBottom: 12 },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  primaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    opacity: 0.6,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  modeHint: { marginTop: 12, paddingHorizontal: 16, fontWeight: "600" },
});
