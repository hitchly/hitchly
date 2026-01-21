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

interface DateTimePickerComponentProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  error?: string;
}

export const DateTimePickerComponent = ({
  value,
  onChange,
  minimumDate,
  error,
}: DateTimePickerComponentProps) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mode, setMode] = useState<"date" | "time">("date");

  const formatDateTime = (date: Date) => {
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} at ${timeStr}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedDate) {
        if (mode === "date") {
          // Update date but keep time
          const newDate = new Date(selectedDate);
          newDate.setHours(value.getHours());
          newDate.setMinutes(value.getMinutes());
          onChange(newDate);
          setShowDatePicker(false);
          // On Android, show time picker after date
          setTimeout(() => {
            setMode("time");
            setShowTimePicker(true);
          }, 100);
        } else {
          // Update time but keep date
          const newDate = new Date(value);
          newDate.setHours(selectedDate.getHours());
          newDate.setMinutes(selectedDate.getMinutes());
          onChange(newDate);
          setShowTimePicker(false);
          setMode("date"); // Reset mode
        }
      } else if (event.type === "dismissed") {
        setShowDatePicker(false);
        setShowTimePicker(false);
        setMode("date"); // Reset mode
      }
    } else {
      // iOS
      if (selectedDate) {
        if (mode === "date") {
          // Update date but keep time
          const newDate = new Date(selectedDate);
          newDate.setHours(value.getHours());
          newDate.setMinutes(value.getMinutes());
          onChange(newDate);
        } else {
          // Update time but keep date
          const newDate = new Date(value);
          newDate.setHours(selectedDate.getHours());
          newDate.setMinutes(selectedDate.getMinutes());
          onChange(newDate);
        }
      }
    }
  };

  const showDatePickerModal = () => {
    setMode("date");
    setShowDatePicker(true);
  };

  const showTimePickerModal = () => {
    setMode("time");
    if (Platform.OS === "ios") {
      setShowTimePicker(true);
    } else {
      setShowTimePicker(true);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pickerButton, error && styles.pickerButtonError]}
        onPress={() => {
          if (Platform.OS === "ios") {
            // iOS: show date picker initially, user can toggle to time
            setMode("date");
            setShowDatePicker(true);
            setShowTimePicker(false);
          } else {
            // Android: show date first
            setMode("date");
            showDatePickerModal();
          }
        }}
      >
        <Ionicons name="calendar" size={20} color="#007AFF" />
        <Text style={styles.pickerText}>{formatDateTime(value)}</Text>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {Platform.OS === "ios" && (showDatePicker || showTimePicker) && (
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setMode("date");
                setShowDatePicker(true);
                setShowTimePicker(false);
              }}
              style={[
                styles.modalButton,
                mode === "date" && styles.modalButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  mode === "date" && styles.modalButtonTextActive,
                ]}
              >
                Date
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setMode("time");
                setShowTimePicker(true);
                setShowDatePicker(false);
              }}
              style={[
                styles.modalButton,
                mode === "time" && styles.modalButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  mode === "time" && styles.modalButtonTextActive,
                ]}
              >
                Time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          {(showDatePicker || showTimePicker) && (
            <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={value}
                mode={mode}
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                textColor="#000000"
                themeVariant="light"
                style={styles.picker}
              />
            </View>
          )}
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

      {Platform.OS === "android" && showTimePicker && (
        <DateTimePicker
          value={value}
          mode="time"
          display="default"
          onChange={handleDateChange}
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
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
    gap: 8,
  },
  pickerButtonError: {
    borderColor: "#ff3b30",
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
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
    gap: 8,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
  },
  modalButtonActive: {
    backgroundColor: "#007AFF",
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  modalButtonTextActive: {
    color: "#fff",
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
