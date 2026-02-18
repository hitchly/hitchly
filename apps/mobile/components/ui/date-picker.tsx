// TODO: Fix eslint errors in this file and re-enable linting
/* eslint-disable */

import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DatePickerComponentProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  error?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  iconColor?: string;
}

export const DatePickerComponent = ({
  value,
  onChange,
  minimumDate,
  error,
  backgroundColor = "#f9f9f9",
  borderColor = "#ddd",
  textColor = "#333",
  iconColor = "#007AFF",
}: DatePickerComponentProps) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedDate) {
        // Set time to start of day (00:00:00)
        const newDate = new Date(selectedDate);
        newDate.setHours(0, 0, 0, 0);
        onChange(newDate);
        setShowDatePicker(false);
      } else if (event.type === "dismissed") {
        setShowDatePicker(false);
      }
    } else {
      // iOS
      if (selectedDate) {
        // Set time to start of day (00:00:00)
        const newDate = new Date(selectedDate);
        newDate.setHours(0, 0, 0, 0);
        onChange(newDate);
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          { backgroundColor, borderColor },
          error && styles.pickerButtonError,
        ]}
        onPress={() => {
          setShowDatePicker(true);
        }}
      >
        <Ionicons name="calendar-outline" size={20} color={iconColor} />
        <Text style={[styles.pickerText, { color: textColor }]}>
          {formatDate(value)}
        </Text>
        <Ionicons name="chevron-down" size={20} color={textColor} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {Platform.OS === "ios" && showDatePicker && (
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowDatePicker(false);
              }}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerWrapper}>
            <DateTimePicker
              value={value}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={minimumDate}
              textColor="#000000"
              themeVariant="light"
              style={styles.picker}
            />
          </View>
        </View>
      )}

      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  pickerButtonError: {
    borderColor: "#ff3b30",
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  doneButton: {
    marginLeft: "auto",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  picker: {
    height: 200,
    width: "100%",
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    width: "100%",
    overflow: "hidden",
  },
});
