import { useMemo } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { FormSection } from "@/components/ui/FormSection";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

function toTimeString(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

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

  const combinedDateTime = useMemo(() => {
    const base = desiredDate ? new Date(desiredDate) : new Date();
    const [rawH, rawM] = desiredArrivalTime.includes(":")
      ? (desiredArrivalTime.split(":").map(Number) as [number, number])
      : [9, 0];
    const h = Number.isNaN(rawH) ? 9 : rawH;
    const m = Number.isNaN(rawM) ? 0 : rawM;
    base.setHours(h, m, 0, 0);
    const min = new Date();
    min.setSeconds(0, 0);
    return base.getTime() >= min.getTime() ? base : min;
  }, [desiredDate, desiredArrivalTime]);

  const setCombinedDateTime = (date: Date) => {
    setDesiredDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate())
    );
    setDesiredArrivalTime(toTimeString(date));
  };

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
        <Card style={styles.routeCard}>
          <DateTimePicker
            label="DATE & TIME"
            value={combinedDateTime}
            onChange={setCombinedDateTime}
            minimumDate={new Date()}
            mode="datetime"
          />
          <Button
            title="SEARCH FOR RIDES"
            onPress={onSearch}
            style={[styles.searchBtn, { backgroundColor: colors.text }]}
            textStyle={styles.searchBtnText}
          />
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
  devCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  searchBtn: { marginTop: 16 },
  searchBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
