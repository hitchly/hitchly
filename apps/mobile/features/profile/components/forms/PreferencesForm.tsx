import {
  updatePreferencesSchema,
  type UpdatePreferencesInput,
} from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { ControlledSwitch } from "@/components/form/ControlledSwitch";
import { SubmitButton } from "@/components/form/SubmitButton";
import { useTheme } from "@/context/theme-context";
import { trpc } from "@/lib/trpc";

interface PreferencesFormProps {
  initialData: UpdatePreferencesInput;
  onSuccess: () => void;
}

export function PreferencesForm({
  initialData,
  onSuccess,
}: PreferencesFormProps) {
  const { colors } = useTheme();

  const methods = useForm<UpdatePreferencesInput>({
    defaultValues: initialData,
    resolver: zodResolver(updatePreferencesSchema),
  });

  const mutation = trpc.profile.updatePreferences.useMutation({
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleOnPress = (): void => {
    void methods.handleSubmit((data) => {
      mutation.mutate(data);
    })();
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <View
          style={[
            styles.switchGroup,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <ControlledSwitch name="music" label="Music" />
          <ControlledSwitch name="chatty" label="Chatty / Social" />
          <ControlledSwitch name="pets" label="Pet Friendly" />
          <ControlledSwitch name="smoking" label="Smoking Allowed" />
        </View>

        <SubmitButton
          title="Save Preferences"
          onPress={handleOnPress}
          isLoading={mutation.isPending}
        />
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  switchGroup: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: "hidden",
  },
});
