import { updateProfileSchema, type UpdateProfileInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { ControlledChipGroup } from "@/components/form/ControlledChipGroup";
import { ControlledInput } from "@/components/form/ControlledInput";
import { ControlledNumberSelector } from "@/components/form/ControlledNumberSelector";
import { ControlledSegmentedControl } from "@/components/form/ControlledSegmentedControl";
import { SubmitButton } from "@/components/form/SubmitButton";
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

  const handleOnPress = (): void => {
    void methods.handleSubmit((data) => {
      mutation.mutate(data);
    })();
  };

  return (
    <FormProvider {...methods}>
      <View style={styles.container}>
        <ControlledInput
          name="bio"
          label="Bio"
          placeholder="Tell us about yourself..."
          multiline
        />
        <ControlledInput
          name="faculty"
          label="Faculty"
          placeholder="Engineering"
        />
        <ControlledNumberSelector
          name="year"
          label="Year of Study"
          min={1}
          max={10}
        />
        <ControlledSegmentedControl
          name="appRole"
          label="I am a..."
          options={[
            { label: "Rider", value: "rider" },
            { label: "Driver", value: "driver" },
          ]}
        />
        <ControlledChipGroup
          name="universityRole"
          label="University Role"
          options={[
            { label: "Student", value: "student" },
            { label: "Professor", value: "professor" },
            { label: "Staff", value: "staff" },
            { label: "Alumni", value: "alumni" },
            { label: "Other", value: "other" },
          ]}
        />
        <SubmitButton
          title="Save Profile"
          onPress={handleOnPress}
          isLoading={mutation.isPending}
        />
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },
});
