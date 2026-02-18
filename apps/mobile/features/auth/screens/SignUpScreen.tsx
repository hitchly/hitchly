import { FormProvider } from "react-hook-form";

import { ControlledInput } from "@/components/form/ControlledInput";
import { SubmitButton } from "@/components/form/SubmitButton";
import { OnboardingLayout } from "@/components/ui/ScreenLayout";
import { useSignUp } from "@/features/auth/hooks/useSignUp";

export function SignUpScreen() {
  const { methods, handleSignUp, loading } = useSignUp();

  return (
    <OnboardingLayout
      title="Create Account"
      subtitle="Join the McMaster carpooling community."
    >
      <FormProvider {...methods}>
        <ControlledInput
          name="name"
          label="Full Name"
          placeholder="Jane Doe"
          autoCapitalize="words"
        />

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
          title="Create Account"
          onPress={handleSignUp}
          isLoading={loading}
        />
      </FormProvider>
    </OnboardingLayout>
  );
}
