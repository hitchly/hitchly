import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DateTimePickerComponent } from "../../../components/ui/datetime-picker";
import { NumericStepper } from "../../../components/ui/numeric-stepper";
import { trpc } from "../../../lib/trpc";

export default function CreateTripScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDateTime, setDepartureDateTime] = useState(
    new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
  );
  const [availableSeats, setAvailableSeats] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createTrip = trpc.trip.createTrip.useMutation({
    onSuccess: () => {
      // Invalidate trips query to refresh the list
      utils.trip.getTrips.invalidate();
      Alert.alert("Success", "Trip created successfully!", [
        {
          text: "OK",
          onPress: () => router.push("/trips" as any),
        },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!origin.trim()) {
      newErrors.origin = "Origin is required";
    }

    if (!destination.trim()) {
      newErrors.destination = "Destination is required";
    }

    const now = new Date();
    const minDepartureTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    if (departureDateTime < minDepartureTime) {
      newErrors.departureDateTime =
        "Departure time must be at least 15 minutes in the future";
    }

    if (availableSeats < 1 || availableSeats > 5) {
      newErrors.availableSeats = "Available seats must be between 1 and 5";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    createTrip.mutate({
      origin: origin.trim(),
      destination: destination.trim(),
      departureTime: departureDateTime,
      maxSeats: availableSeats,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Trip</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <Text style={styles.label}>Origin</Text>
          <TextInput
            style={[styles.input, errors.origin && styles.inputError]}
            value={origin}
            onChangeText={(text) => {
              setOrigin(text);
              if (errors.origin) {
                setErrors({ ...errors, origin: "" });
              }
            }}
            placeholder="Enter origin address"
            placeholderTextColor="#999"
          />
          {errors.origin && (
            <Text style={styles.errorText}>{errors.origin}</Text>
          )}

          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={[styles.input, errors.destination && styles.inputError]}
            value={destination}
            onChangeText={(text) => {
              setDestination(text);
              if (errors.destination) {
                setErrors({ ...errors, destination: "" });
              }
            }}
            placeholder="Enter destination address"
            placeholderTextColor="#999"
          />
          {errors.destination && (
            <Text style={styles.errorText}>{errors.destination}</Text>
          )}

          <Text style={styles.label}>Departure Date & Time</Text>
          <DateTimePickerComponent
            value={departureDateTime}
            onChange={(date) => {
              setDepartureDateTime(date);
              if (errors.departureDateTime) {
                setErrors({ ...errors, departureDateTime: "" });
              }
            }}
            minimumDate={new Date(Date.now() + 15 * 60 * 1000)}
            error={errors.departureDateTime}
          />

          <Text style={styles.label}>Available Seats</Text>
          <NumericStepper
            value={availableSeats}
            onValueChange={(value) => {
              setAvailableSeats(value);
              if (errors.availableSeats) {
                setErrors({ ...errors, availableSeats: "" });
              }
            }}
            min={1}
            max={5}
            error={errors.availableSeats}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={createTrip.isPending}
          >
            {createTrip.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Trip</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
