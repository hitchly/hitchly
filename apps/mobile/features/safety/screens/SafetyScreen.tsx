import { Ionicons } from "@expo/vector-icons";
import { Linking, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormSection } from "@/components/ui/FormSection";
import { Text } from "@/components/ui/Text";
import { SafetyContacts } from "@/constants/safety";
import { useTheme } from "@/context/theme-context";
import { useSafety } from "@/features/safety/hooks/useSafety";

export function SafetyScreen({ tripId }: { tripId?: string }) {
  const { colors } = useTheme();
  const {
    trips,
    activeTripId,
    setActiveTripId,
    reportedUserLabel,
    reason,
    setReason,
    isSubmitting,
    canSubmit,
    submitReport,
  } = useSafety(tripId);

  const handleLink = (url: string) => void Linking.openURL(url);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <FormSection title="IMMEDIATE ASSISTANCE">
          <View style={styles.row}>
            <Button
              title="CALL LINE"
              icon="call"
              variant="secondary"
              style={styles.flex1}
              onPress={() => {
                handleLink(`tel:${SafetyContacts.phone}`);
              }}
            />
            <Button
              title="EMAIL TEAM"
              icon="mail"
              variant="secondary"
              style={styles.flex1}
              onPress={() => {
                handleLink(`mailto:${SafetyContacts.email}`);
              }}
            />
          </View>
        </FormSection>

        <FormSection title="REPORT AN ISSUE">
          <Card style={styles.mainCard}>
            {!activeTripId ? (
              <View>
                <Text variant="bodySemibold" style={styles.mb12}>
                  Select a trip to report:
                </Text>
                {trips.length === 0 ? (
                  <Text variant="caption" color={colors.textSecondary}>
                    No recent history found.
                  </Text>
                ) : (
                  trips.slice(0, 3).map((t) => {
                    const originCity = t.origin.split(",")[0] ?? "Unknown";
                    const destCity = t.destination.split(",")[0] ?? "Unknown";
                    return (
                      <Button
                        key={t.id}
                        title={`${originCity} → ${destCity}`}
                        variant="ghost"
                        onPress={() => {
                          setActiveTripId(t.id);
                        }}
                        style={styles.tripBtn}
                        icon="chevron-forward"
                        iconPosition="right"
                      />
                    );
                  })
                )}
              </View>
            ) : (
              <View>
                <View style={styles.formHeader}>
                  <View>
                    <Text variant="label" color={colors.textSecondary}>
                      SUBJECT
                    </Text>
                    <Text variant="bodySemibold">{reportedUserLabel}</Text>
                  </View>
                  <Button
                    icon="swap-horizontal"
                    variant="secondary"
                    size="icon"
                    onPress={() => {
                      setActiveTripId(null);
                    }}
                  />
                </View>

                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.surfaceSecondary,
                    },
                  ]}
                  placeholder="Describe what happened..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={5}
                  value={reason}
                  onChangeText={setReason}
                  textAlignVertical="top"
                />

                <Button
                  title="SUBMIT REPORT"
                  onPress={() => {
                    submitReport();
                  }}
                  disabled={!canSubmit}
                  isLoading={isSubmitting}
                  size="lg"
                />
              </View>
            )}
          </Card>
        </FormSection>

        <View style={styles.footer}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text variant="caption" color={colors.textSecondary}>
            If you are in immediate danger, please call 911 immediately.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  modalHandleContainer: { alignItems: "center", paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  row: { flexDirection: "row", gap: 10 },
  flex1: { flex: 1 },
  mainCard: { padding: 20 },
  mb12: { marginBottom: 12 },
  tripBtn: { justifyContent: "space-between", paddingHorizontal: 0 },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    minHeight: 120,
    marginBottom: 16,
    fontSize: 15,
  },
  footer: {
    marginTop: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});
