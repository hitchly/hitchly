import {
  updatePreferencesSchema,
  type UpdatePreferencesInput,
} from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { ControlledSwitchRow } from "@/components/form/ControlledSwitchRow";
import { SubmitButton } from "@/components/form/SubmitButton";
import { FormSection } from "@/components/ui/FormSection";
import { RowGroup } from "@/components/ui/RowGroup";
import { trpc } from "@/lib/trpc";

interface PreferencesFormProps {
  initialData: UpdatePreferencesInput;
  onSuccess: () => void;
}

export function PreferencesForm({
  initialData,
  onSuccess,
}: PreferencesFormProps) {
  const methods = useForm<UpdatePreferencesInput>({
    defaultValues: initialData,
    resolver: zodResolver(updatePreferencesSchema),
  });

  const mutation = trpc.profile.updatePreferences.useMutation({
    onSuccess,
  });

  const handleSave = methods.handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <FormSection
          title="RIDE PREFERENCES"
          description="Customize your commuting experience. These will be visible to potential matches."
        >
          <RowGroup>
            <ControlledSwitchRow
              name="music"
              label="Music"
              icon="musical-notes-outline"
            />
            <ControlledSwitchRow
              name="chatty"
              label="Chatty / Social"
              icon="chatbubbles-outline"
            />
            <ControlledSwitchRow
              name="pets"
              label="Pet Friendly"
              icon="paw-outline"
            />
          </RowGroup>
        </FormSection>

        <SubmitButton
          title="SAVE PREFERENCES"
          onPress={() => void handleSave()}
          isLoading={mutation.isPending}
        />
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
});
