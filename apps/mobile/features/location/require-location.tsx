import Ionicons from "@expo/vector-icons/Ionicons";
import { saveAddressSchema, type SaveAddressInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { FormProvider, useForm, type SubmitHandler } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ControlledLocationInput } from "@/components/form/ControlledLocationInput";
import { SubmitButton } from "@/components/form/SubmitButton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";
import { useGPSLocation } from "@/hooks/useGpsLocation";
import { trpc } from "@/lib/trpc";

export const RequireLocation = ({ children }: { children: ReactNode }) => {
  const { colors } = useTheme();
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.profile.getMe.useQuery();

  const saveAddressMutation = trpc.location.saveDefaultAddress.useMutation({
    onSuccess: () => {
      void utils.profile.getMe.invalidate();
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const methods = useForm<SaveAddressInput>({
    resolver: zodResolver(saveAddressSchema),
    defaultValues: {
      address: "",
      latitude: 0,
      longitude: 0,
    },
    mode: "onChange",
  });

  const { control, handleSubmit, setValue, watch } = methods;

  const { getLocation, isGeocoding } = useGPSLocation((loc) => {
    setValue("address", loc.address, { shouldValidate: true });
    setValue("latitude", loc.latitude);
    setValue("longitude", loc.longitude);
  });

  const [lat, long] = watch(["latitude", "longitude"]);
  const isAddressVerified = lat !== 0 && long !== 0;

  const onSubmit: SubmitHandler<SaveAddressInput> = (data) => {
    if (data.latitude === 0 || data.longitude === 0) {
      Alert.alert("Invalid Address", "Please select from the dropdown.");
      return;
    }
    saveAddressMutation.mutate(data);
  };

  const handleOnPress = handleSubmit(onSubmit);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (profile?.profile.defaultAddress) {
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
            <Ionicons name="location-outline" size={48} color={colors.text} />
            <Text variant="h2" style={styles.title}>
              SET YOUR LOCATION
            </Text>
            <Text variant="body" color={colors.textSecondary} align="center">
              Enter your primary pickup/drop-off address to continue using
              Hitchly.
            </Text>
          </View>

          <FormProvider {...methods}>
            <View style={styles.form}>
              <ControlledLocationInput<SaveAddressInput>
                control={control}
                name="address"
                label="ADDRESS"
                placeholder="1280 Main St W, Hamilton"
                onTextChange={() => {
                  setValue("latitude", 0);
                  setValue("longitude", 0);
                }}
                onSelect={(details: { lat: number; long: number }) => {
                  setValue("latitude", details.lat);
                  setValue("longitude", details.long);
                }}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.gpsButton,
                  { opacity: pressed || isGeocoding ? 0.6 : 1 },
                ]}
                onPress={() => {
                  void getLocation();
                }}
                disabled={isGeocoding}
              >
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color={colors.text}
                />
                <Text variant="bodySemibold" style={styles.gpsText}>
                  Use current location
                </Text>
              </Pressable>

              <SubmitButton
                disabled={!isAddressVerified || isGeocoding}
                title={
                  isGeocoding
                    ? "VERIFYING..."
                    : isAddressVerified
                      ? "SAVE ADDRESS"
                      : "SELECT AN ADDRESS"
                }
                onPress={() => {
                  void handleOnPress();
                }}
                isLoading={saveAddressMutation.isPending}
                style={styles.submit}
              />
            </View>
          </FormProvider>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 40, gap: 12 },
  title: { marginTop: 8 },
  form: { width: "100%" },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
    gap: 8,
  },
  gpsText: { textTransform: "uppercase", fontSize: 12 },
  submit: { marginTop: 32 },
});
