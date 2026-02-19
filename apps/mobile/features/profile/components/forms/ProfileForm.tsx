import { updateProfileSchema, type UpdateProfileInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { ControlledChipGroup } from "@/components/form/ControlledChipGroup";
import { ControlledInput } from "@/components/form/ControlledInput";
import { ControlledNumberSelector } from "@/components/form/ControlledNumberSelector";
import { SubmitButton } from "@/components/form/SubmitButton";
import { FormSection } from "@/components/ui/FormSection";
import { trpc } from "@/lib/trpc";

interface ProfileFormProps {
  initialData: UpdateProfileInput;
  onSuccess: () => void;
}

export function ProfileForm({ initialData, onSuccess }: ProfileFormProps) {
  const methods = useForm<UpdateProfileInput>({
    defaultValues: initialData,
    resolver: zodResolver(updateProfileSchema),
  });

  const mutation = trpc.profile.updateProfile.useMutation({ onSuccess });

  const handleSave = methods.handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <FormSection
          title="ABOUT YOU"
          description="Introduce yourself to the McMaster community."
        >
          <ControlledInput
            name="bio"
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={4}
          />
        </FormSection>

        <FormSection
          title="ACADEMIC INFO"
          description="Helps matches know who they are commuting with."
        >
          <ControlledInput
            name="faculty"
            label="FACULTY"
            placeholder="e.g. Engineering, Health Sciences"
          />
          <ControlledNumberSelector
            name="year"
            label="YEAR OF STUDY"
            min={1}
            max={10}
          />
        </FormSection>

        <FormSection title="UNIVERSITY ROLE">
          <ControlledChipGroup
            name="universityRole"
            options={[
              { label: "Student", value: "student" },
              { label: "Professor", value: "professor" },
              { label: "Staff", value: "staff" },
              { label: "Alumni", value: "alumni" },
              { label: "Other", value: "other" },
            ]}
          />
        </FormSection>

        <View style={styles.footer}>
          <SubmitButton
            title="SAVE PROFILE"
            onPress={() => void handleSave()}
            isLoading={mutation.isPending}
          />
        </View>
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  footer: {
    marginTop: 8,
  },
});
