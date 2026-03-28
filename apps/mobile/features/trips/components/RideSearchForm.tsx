import { Ionicons } from "@expo/vector-icons";
import { MCMASTER_DROPOFF_OPTIONS } from "@hitchly/utils";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  selectedDropoffId: string | null;
  setSelectedDropoffId: (id: string | null) => void;
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
  selectedDropoffId,
  setSelectedDropoffId,
  onSearch,
}: RideSearchFormProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [dropoffModalOpen, setDropoffModalOpen] = useState(false);

  const dropoffDisplayLabel = useMemo(() => {
    if (!selectedDropoffId) return "No preference";
    return (
      MCMASTER_DROPOFF_OPTIONS.find((o) => o.id === selectedDropoffId)?.label ??
      "No preference"
    );
  }, [selectedDropoffId]);

  useEffect(() => {
    if (direction !== "toMcmaster") {
      setDropoffModalOpen(false);
    }
  }, [direction]);

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

          {direction === "toMcmaster" && (
            <View style={styles.dropoffBlock}>
              <Text variant="caption" color={colors.textTertiary}>
                Specified Location (optional)
              </Text>
              <Pressable
                onPress={() => {
                  setDropoffModalOpen(true);
                }}
                style={[
                  styles.dropoffSelect,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <Text variant="body" numberOfLines={1} style={styles.flexOne}>
                  {dropoffDisplayLabel}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          )}

          <View style={styles.dateTimeSection}>
            <DateTimePicker
              label="DATE & TIME"
              value={combinedDateTime}
              onChange={setCombinedDateTime}
              minimumDate={new Date()}
              mode="datetime"
            />
          </View>
          <Button
            title="SEARCH FOR RIDES"
            onPress={onSearch}
            style={[styles.searchBtn, { backgroundColor: colors.text }]}
            textStyle={styles.searchBtnText}
          />
        </Card>
      </FormSection>

      <Modal
        visible={dropoffModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setDropoffModalOpen(false);
        }}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setDropoffModalOpen(false);
            }}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <Text variant="bodySemibold" style={styles.modalTitle}>
              Campus drop-off
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                onPress={() => {
                  setSelectedDropoffId(null);
                  setDropoffModalOpen(false);
                }}
                style={[
                  styles.modalRow,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor:
                      selectedDropoffId === null
                        ? colors.border + "40"
                        : "transparent",
                  },
                ]}
              >
                <Text variant="body">No preference</Text>
                {selectedDropoffId === null ? (
                  <Ionicons name="checkmark" size={22} color={colors.text} />
                ) : null}
              </Pressable>
              {MCMASTER_DROPOFF_OPTIONS.map((option) => {
                const selected = selectedDropoffId === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      setSelectedDropoffId(option.id);
                      setDropoffModalOpen(false);
                    }}
                    style={[
                      styles.modalRow,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: selected
                          ? colors.border + "40"
                          : "transparent",
                      },
                    ]}
                  >
                    <Text variant="body">{option.label}</Text>
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={22}
                        color={colors.text}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button
              title="Done"
              variant="secondary"
              onPress={() => {
                setDropoffModalOpen(false);
              }}
              style={styles.modalDoneBtn}
            />
          </View>
        </View>
      </Modal>
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
  dropoffBlock: { marginTop: 20, marginBottom: 4, gap: 6 },
  dropoffSelect: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  flexOne: { flex: 1 },
  /** Breathing room after FROM/TO (and optional drop-off) before scheduling */
  dateTimeSection: { marginTop: 20 },
  searchBtn: { marginTop: 16 },
  searchBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: "72%",
  },
  modalTitle: { marginBottom: 8 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalDoneBtn: { marginTop: 12 },
});
