import Ionicons from "@expo/vector-icons/Ionicons";
import { saveAddressSchema, type SaveAddressInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
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
import { useGPSLocation } from "../../hooks/use-gps-location";
import { trpc } from "../../lib/trpc";
import { ControlledLocationInput, SubmitButton } from "../ui/form";

export const RequireLocation = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { colors } = useTheme();
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.profile.getMe.useQuery();

  const saveAddressMutation = trpc.location.saveDefaultAddress.useMutation({
    onSuccess: () => {
      utils.profile.getMe.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const { control, handleSubmit, setValue, watch } = useForm<SaveAddressInput>({
    resolver: zodResolver(saveAddressSchema),
    defaultValues: {
      address: "",
      latitude: 0,
      longitude: 0,
    },
  });

  const { getLocation, isGeocoding } = useGPSLocation((loc) => {
    setValue("address", loc.address);
    setValue("latitude", loc.latitude);
    setValue("longitude", loc.longitude);
  });

  const [lat, long] = watch(["latitude", "longitude"]);
  const isAddressVerified = lat !== 0 && long !== 0;

  const onSubmit = (data: SaveAddressInput) => {
    if (data.latitude === 0 || data.longitude === 0) {
      Alert.alert("Invalid Address", "Please select from the dropdown.");
      return;
    }
    saveAddressMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (profile?.profile?.defaultAddress) {
    return <>{children}</>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.content}
        >
          <View style={styles.header}>
            <Ionicons name="location" size={48} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>
              Set Your Location
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your primary pickup/drop-off address to continue.
            </Text>
          </View>

          <View style={styles.form}>
            <ControlledLocationInput
              control={control}
              name="address"
              label="Address"
              placeholder="1280 Main St W, Hamilton"
              // Invalidate verification on manual type
              onTextChange={() => {
                setValue("latitude", 0);
                setValue("longitude", 0);
              }}
              // Validate on selection
              onSelect={(details) => {
                setValue("latitude", details.lat);
                setValue("longitude", details.long);
              }}
            />

            <TouchableOpacity
              style={styles.gpsButton}
              onPress={getLocation}
              disabled={isGeocoding}
            >
              <Ionicons
                name="navigate-circle"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.gpsText, { color: colors.primary }]}>
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
