import Ionicons from "@expo/vector-icons/Ionicons";
import { SaveAddressInput } from "@hitchly/db";
import * as Location from "expo-location";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/theme-context";
import { trpc } from "../../lib/trpc";
import { ControlledLocationInput, SubmitButton } from "../ui/form";

export const RequireLocation = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  const utils = trpc.useUtils();

  const {
    data: profile,
    isLoading,
    refetch,
  } = trpc.profile.getMe.useQuery(undefined, {
    retry: false,
  });

  const saveAddressMutation = trpc.location.saveDefaultAddress.useMutation({
    onSuccess: () => {
      refetch(); // Reload to clear blocking screen
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  // 1. Form Setup with Watch
  const { control, handleSubmit, setValue, watch } = useForm<SaveAddressInput>({
    defaultValues: {
      address: "",
      latitude: 0,
      longitude: 0,
    },
  });

  // 2. Watch Coordinates for Validation
  // If coordinates are 0, the address is NOT verified
  const [lat, long] = watch(["latitude", "longitude"]);
  const isAddressVerified = lat !== 0 && long !== 0;

  const [isGeocoding, setIsGeocoding] = useState(false);

  // 3. Logic: Use GPS
  const handleUseCurrentLocation = async () => {
    setIsGeocoding(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please enter your address manually.");
        setIsGeocoding(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (place) {
        const formatted = [
          place.name !== place.street ? place.name : null,
          place.street,
          place.city,
        ]
          .filter(Boolean)
          .join(", ");

        // Sets valid coordinates
        setValue("address", formatted);
        setValue("latitude", loc.coords.latitude);
        setValue("longitude", loc.coords.longitude);
      }
    } catch (e) {
      Alert.alert("Error", "Could not fetch location.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = async (data: {
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    // Redundant safety check
    if (data.latitude === 0 || data.longitude === 0) {
      Alert.alert(
        "Invalid Address",
        "Please select a valid address from the dropdown."
      );
      return;
    }

    saveAddressMutation.mutate({
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
    });
  };

  if (isLoading) return null;

  if (profile?.profile?.defaultAddress) {
    return <>{children}</>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <View style={styles.header}>
            <Ionicons name="location" size={48} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>
              Set Your Location
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your primary pickup/drop-off address to continue.
            </Text>
          </View>

          <View style={styles.form}>
            <ControlledLocationInput
              control={control}
              name="address"
              label="Address"
              placeholder="1280 Main St W, Hamilton"
              onTextChange={() => {
                setValue("latitude", 0);
                setValue("longitude", 0);
              }}
              onSelect={(details) => {
                setValue("latitude", details.lat);
                setValue("longitude", details.long);
              }}
            />

            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleUseCurrentLocation}
              disabled={isGeocoding}
            >
              <Ionicons
                name="navigate-circle"
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.gpsText, { color: theme.primary }]}>
                Use current location
              </Text>
            </TouchableOpacity>

            <SubmitButton
              disabled={!isAddressVerified || isGeocoding}
              title={
                isGeocoding
                  ? "Verifying..."
                  : isAddressVerified
                    ? "Save Address"
                    : "Select an Address"
              }
              onPress={handleSubmit(onSubmit)}
              isPending={saveAddressMutation.isPending}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  title: { fontSize: 24, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: "center", lineHeight: 22 },
  form: { width: "100%" },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 8,
  },
  gpsText: { marginLeft: 8, fontWeight: "600" },
});
