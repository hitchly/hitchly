import Ionicons from "@expo/vector-icons/Ionicons";
import { saveAddressSchema, type SaveAddressInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ControlledLocationInput } from "@/components/form/ControlledLocationInput";
import { SubmitButton } from "@/components/form/SubmitButton";
import { useTheme } from "@/context/theme-context";
import { useGPSLocation } from "@/hooks/use-gps-location";
import { trpc } from "@/lib/trpc";

interface LocationFormProps {
  initialData: SaveAddressInput;
  onSuccess: () => void;
}

export function LocationForm({ initialData, onSuccess }: LocationFormProps) {
  const { colors } = useTheme();

  const methods = useForm<SaveAddressInput>({
    resolver: zodResolver(saveAddressSchema),
    defaultValues: initialData,
  });

  const lat = useWatch({ control: methods.control, name: "latitude" });
  const lng = useWatch({ control: methods.control, name: "longitude" });
  const isVerified = lat !== 0 && lng !== 0;

  const mutation = trpc.location.saveDefaultAddress.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const { getLocation, isGeocoding } = useGPSLocation((loc) => {
    methods.setValue("address", loc.address);
    methods.setValue("latitude", loc.latitude);
    methods.setValue("longitude", loc.longitude);
  });

  const handleOnPress = (): void => {
    if (!isVerified) {
      Alert.alert(
        "Invalid Address",
        "Please select a valid address from the list."
      );
      return;
    }

    void methods.handleSubmit((data) => {
      mutation.mutate(data);
    })();
  };

  const handleGetLocation = (): void => {
    void getLocation();
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <ControlledLocationInput
          name="address"
          label="Home Address"
          placeholder="1280 Main St W, Hamilton"
          onLocationSelected={(latitude, longitude) => {
            methods.setValue("latitude", latitude);
            methods.setValue("longitude", longitude);
          }}
        />

        <TouchableOpacity
          style={styles.gpsRow}
          onPress={handleGetLocation}
          disabled={isGeocoding}
        >
          <Ionicons
            name="navigate-circle"
            size={20}
            color={isGeocoding ? colors.disabledText : colors.primary}
          />
          <Text
            style={[
              styles.gpsText,
              { color: isGeocoding ? colors.disabledText : colors.primary },
            ]}
          >
            {isGeocoding ? "Locating..." : "Use Current Location"}
          </Text>
        </TouchableOpacity>

        <SubmitButton
          title={isVerified ? "Save Address" : "Select an Address"}
          onPress={handleOnPress}
          isLoading={mutation.isPending}
          disabled={!isVerified}
        />
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  gpsText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
