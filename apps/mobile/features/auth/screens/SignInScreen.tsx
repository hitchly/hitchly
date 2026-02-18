import { FormProvider } from "react-hook-form";

import { ControlledInput } from "@/components/form/ControlledInput";
import { SubmitButton } from "@/components/form/SubmitButton";
import { OnboardingLayout } from "@/components/ui/ScreenLayout";
import { useSignIn } from "@/features/auth/hooks/useSignIn";

export function SignInScreen() {
  const { methods, handleSignIn, loading } = useSignIn();

  return (
    <OnboardingLayout title="Sign In" subtitle="Welcome back to Hitchly.">
      <FormProvider {...methods}>
        <ControlledInput
          name="email"
          label="McMaster Email"
          placeholder="jane@mcmaster.ca"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <ControlledInput
          name="password"
          label="Password"
          placeholder="••••••••"
          secureTextEntry
        />

        <SubmitButton
          title="Sign In"
          onPress={handleSignIn}
          isLoading={loading}
        />
      </FormProvider>
    </OnboardingLayout>
  );
}
