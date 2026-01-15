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
import { trpc } from "../../../lib/trpc";

export default function CreateTripScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState("1");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createTrip = trpc.trip.createTrip.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Trip created successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
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

    if (!departureDate.trim()) {
      newErrors.departureDate = "Departure date is required";
    }

    if (!departureTime.trim()) {
      newErrors.departureTime = "Departure time is required";
    }

    const seats = parseInt(availableSeats, 10);
    if (isNaN(seats) || seats < 1 || seats > 5) {
      newErrors.availableSeats = "Available seats must be between 1 and 5";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Combine date and time into a Date object
    const departureDateTime = new Date(`${departureDate}T${departureTime}`);

    if (isNaN(departureDateTime.getTime())) {
      Alert.alert("Error", "Invalid date or time format");
      return;
    }

    createTrip.mutate({
      origin: origin.trim(),
      destination: destination.trim(),
      departureTime: departureDateTime,
      availableSeats: parseInt(availableSeats, 10),
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Origin</Text>
        <TextInput
          style={[styles.input, errors.origin && styles.inputError]}
          placeholder="Enter origin address"
          value={origin}
          onChangeText={(text) => {
            setOrigin(text);
            if (errors.origin) {
              setErrors({ ...errors, origin: "" });
            }
          }}
        />
        {errors.origin && <Text style={styles.errorText}>{errors.origin}</Text>}

        <Text style={styles.label}>Destination</Text>
        <TextInput
          style={[styles.input, errors.destination && styles.inputError]}
          placeholder="Enter destination address"
          value={destination}
          onChangeText={(text) => {
            setDestination(text);
            if (errors.destination) {
              setErrors({ ...errors, destination: "" });
            }
          }}
        />
        {errors.destination && (
          <Text style={styles.errorText}>{errors.destination}</Text>
        )}

        <Text style={styles.label}>Departure Date</Text>
        <TextInput
          style={[styles.input, errors.departureDate && styles.inputError]}
          placeholder="YYYY-MM-DD"
          value={departureDate}
          onChangeText={(text) => {
            setDepartureDate(text);
            if (errors.departureDate) {
              setErrors({ ...errors, departureDate: "" });
            }
          }}
        />
        {errors.departureDate && (
          <Text style={styles.errorText}>{errors.departureDate}</Text>
        )}

        <Text style={styles.label}>Departure Time</Text>
        <TextInput
          style={[styles.input, errors.departureTime && styles.inputError]}
          placeholder="HH:MM (24-hour format)"
          value={departureTime}
          onChangeText={(text) => {
            setDepartureTime(text);
            if (errors.departureTime) {
              setErrors({ ...errors, departureTime: "" });
            }
          }}
        />
        {errors.departureTime && (
          <Text style={styles.errorText}>{errors.departureTime}</Text>
        )}

        <Text style={styles.label}>Available Seats</Text>
        <TextInput
          style={[styles.input, errors.availableSeats && styles.inputError]}
          placeholder="1-5"
          keyboardType="numeric"
          value={availableSeats}
          onChangeText={(text) => {
            setAvailableSeats(text);
            if (errors.availableSeats) {
              setErrors({ ...errors, availableSeats: "" });
            }
          }}
        />
        {errors.availableSeats && (
          <Text style={styles.errorText}>{errors.availableSeats}</Text>
        )}

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  },
  inputError: {
    borderColor: "#ff3b30",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 4,
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
