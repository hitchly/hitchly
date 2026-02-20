import { saveAddressSchema, type SaveAddressInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { Alert, StyleSheet, View } from "react-native";

import { ControlledLocationInput } from "@/components/form/ControlledLocationInput";
import { SubmitButton } from "@/components/form/SubmitButton";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { Text } from "@/components/ui/Text";
import { useGPSLocation } from "@/hooks/useGpsLocation";
import { trpc } from "@/lib/trpc";

interface LocationFormProps {
  initialData: SaveAddressInput;
  onSuccess: () => void;
}

export function LocationForm({ initialData, onSuccess }: LocationFormProps) {
  const methods = useForm<SaveAddressInput>({
    resolver: zodResolver(saveAddressSchema),
    defaultValues: initialData,
    mode: "onChange",
  });

  const { control, setValue, handleSubmit } = methods;

  const lat = useWatch({ control, name: "latitude" });
  const lng = useWatch({ control, name: "longitude" });
  const isVerified = lat !== 0 && lng !== 0;

  const mutation = trpc.location.saveDefaultAddress.useMutation({
    onSuccess,
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const { getLocation, isGeocoding } = useGPSLocation((loc) => {
    setValue("address", loc.address, { shouldValidate: true });
    setValue("latitude", loc.latitude);
    setValue("longitude", loc.longitude);
  });

  const handleSave = handleSubmit((data) => {
    if (!isVerified) {
      Alert.alert("Invalid Address", "Please select an address from the list.");
      return;
    }
    mutation.mutate(data);
  });

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <FormSection
          title="HOME ADDRESS"
          description="Enter your primary pickup or drop-off location."
        >
          <ControlledLocationInput<SaveAddressInput>
            control={control}
            name="address"
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

          <Button
            title={isGeocoding ? "LOCATING..." : "USE CURRENT LOCATION"}
            variant="ghost"
            size="sm"
            icon="navigate-outline"
            onPress={() => {
              void getLocation();
            }}
            isLoading={isGeocoding}
            style={styles.gpsButton}
            textStyle={styles.gpsButtonText}
          />
        </FormSection>

        <View style={styles.footer}>
          <SubmitButton
            title={isVerified ? "SAVE ADDRESS" : "SELECT VALID ADDRESS"}
            onPress={() => {
              void handleSave();
            }}
            isLoading={mutation.isPending}
            disabled={!isVerified}
          />
          {!isVerified && (
            <Text
              variant="caption"
              align="center"
              color="textTertiary"
              style={styles.hint}
            >
              Search for your address and select it from the dropdown to verify
              the coordinates.
            </Text>
          )}
        </View>
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  gpsButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginTop: -4,
  },
  gpsButtonText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 8,
    gap: 12,
  },
  hint: {
    paddingHorizontal: 40,
    marginTop: 4,
  },
});
