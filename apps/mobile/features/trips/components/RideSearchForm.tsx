import { ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePickerComponent } from "@/components/ui/date-picker";
import { FormSection } from "@/components/ui/FormSection";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface RideSearchFormProps {
  userAddress?: string | null;
  direction: "toMcmaster" | "fromMcmaster";
  setDirection: (val: "toMcmaster" | "fromMcmaster") => void;
  desiredDate: Date | null;
  setDesiredDate: (date: Date) => void;
  desiredArrivalTime: string;
  setDesiredArrivalTime: (time: string) => void;
  isTestUser: boolean;
  includeDummyMatches: boolean;
  setIncludeDummyMatches: (val: boolean) => void;
  onSearch: () => void;
}

export function RideSearchForm({
  userAddress,
  direction,
  setDirection,
  desiredDate,
  setDesiredDate,
  desiredArrivalTime,
  setDesiredArrivalTime,
  isTestUser,
  includeDummyMatches,
  setIncludeDummyMatches,
  onSearch,
}: RideSearchFormProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.searchForm}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="h1" style={styles.pageTitle}>
        FIND A RIDE
      </Text>

      <FormSection title="ROUTE">
        <Card style={styles.routeCard}>
          <View style={styles.directionHeader}>
            <Text variant="label" color={colors.textSecondary}>
              DIRECTION
            </Text>
            <Button
              size="icon"
              variant="ghost"
              icon="swap-vertical"
              onPress={() => {
                setDirection(
                  direction === "toMcmaster" ? "fromMcmaster" : "toMcmaster"
                );
              }}
            />
          </View>

          <View style={styles.routeRow}>
            <View style={styles.timeline}>
              <View style={[styles.dot, { backgroundColor: colors.text }]} />
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <View
                style={[
                  styles.dot,
                  styles.dotOutline,
                  { borderColor: colors.text },
                ]}
              />
            </View>
            <View style={styles.locationContainer}>
              <View style={styles.locationItem}>
                <Text variant="label" color={colors.textSecondary}>
                  FROM
                </Text>
                <Text variant="bodySemibold" numberOfLines={1}>
                  {direction === "toMcmaster"
                    ? (userAddress ?? "Home")
                    : "McMaster University"}
                </Text>
              </View>
              <View style={styles.locationItem}>
                <Text variant="label" color={colors.textSecondary}>
                  TO
                </Text>
                <Text variant="bodySemibold" numberOfLines={1}>
                  {direction === "toMcmaster"
                    ? "McMaster University"
                    : (userAddress ?? "Home")}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </FormSection>

      <FormSection title="LOGISTICS">
        <Card style={styles.logisticsCard}>
          <View style={styles.inputGroup}>
            <Text variant="label" color={colors.textSecondary}>
              DATE
            </Text>
            <DatePickerComponent
              value={desiredDate ?? new Date()}
              onChange={setDesiredDate}
              minimumDate={new Date()}
              backgroundColor={colors.surfaceSecondary}
              borderColor={colors.border}
              textColor={colors.text}
              iconColor={colors.text}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text variant="label" color={colors.textSecondary}>
              ARRIVAL TIME
            </Text>
            <TextInput
              style={[
                styles.timeInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={desiredArrivalTime}
              onChangeText={setDesiredArrivalTime}
              placeholder="HH:MM"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </Card>
      </FormSection>

      {isTestUser && (
        <FormSection title="DEVELOPER OPTIONS">
          <Card style={styles.devCard}>
            <Text variant="bodySemibold">Include Test Matches</Text>
            <Switch
              value={includeDummyMatches}
              onValueChange={setIncludeDummyMatches}
              trackColor={{ false: colors.border, true: colors.text }}
              thumbColor={colors.background}
            />
          </Card>
        </FormSection>
      )}

      <Button
        title="SEARCH FOR RIDES"
        size="lg"
        icon="search-outline"
        onPress={onSearch}
        style={styles.searchBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchForm: { padding: 24, paddingBottom: 60 },
  pageTitle: { marginBottom: 32 },
  routeCard: { padding: 20 },
  directionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  routeRow: { flexDirection: "row", gap: 20 },
  timeline: { alignItems: "center", width: 12, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOutline: { backgroundColor: "transparent", borderWidth: 2 },
  line: { width: 1, flex: 1, marginVertical: 4 },
  locationContainer: { flex: 1, gap: 24 },
  locationItem: { gap: 4 },
  logisticsCard: { padding: 20, gap: 20 },
  inputGroup: { gap: 8 },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
  },
  devCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  searchBtn: { marginTop: 32 },
});
