import { Ionicons } from "@expo/vector-icons";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import RNDateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

export interface DateTimePickerProps {
  label?: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  minimumDate?: Date;
  mode?: "date" | "time" | "datetime";
}

export function DateTimePicker({
  label,
  value,
  onChange,
  error,
  minimumDate,
  mode = "datetime",
}: DateTimePickerProps) {
  const { colors, isDark } = useTheme();
  const [showIos, setShowIos] = useState(false);

  const formattedValue = useMemo(() => {
    return value.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [value]);

  const showAndroidPicker = () => {
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      is24Hour: true,
      minimumDate,
      onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type === "dismissed") return;

        if (event.type === "set" && selectedDate) {
          if (mode === "datetime") {
            DateTimePickerAndroid.open({
              value: selectedDate,
              mode: "time",
              is24Hour: true,
              onChange: (timeEvent: DateTimePickerEvent, finalDate?: Date) => {
                if (timeEvent.type === "set" && finalDate) {
                  onChange(finalDate);
                }
              },
            });
          } else {
            onChange(selectedDate);
          }
        }
      },
    });
  };

  const handleIosChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "set" && selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}

      <Pressable
        onPress={() => {
          if (Platform.OS === "android") {
            showAndroidPicker();
          } else {
            setShowIos(true);
          }
        }}
        style={({ pressed }) => [
          styles.inputWrapper,
          {
            borderColor: error ? colors.error : colors.border,
            backgroundColor: colors.background,
            borderWidth: Platform.OS === "ios" && showIos ? 1.5 : 1,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={colors.primary}
          style={styles.icon}
        />
        <Text variant="body" color={colors.text}>
          {formattedValue}
        </Text>
      </Pressable>

      {Platform.OS === "ios" && showIos && (
        <RNDateTimePicker
          value={value}
          mode={mode}
          is24Hour={true}
          display="spinner"
          minimumDate={minimumDate}
          onChange={handleIosChange}
          themeVariant={isDark ? "dark" : "light"}
        />
      )}

      {error && (
        <Text variant="caption" color={colors.error} style={styles.helper}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: "100%" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  icon: { marginRight: 12 },
  helper: { fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: "500" },
});
