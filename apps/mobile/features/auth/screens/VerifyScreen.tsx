import { FormProvider } from "react-hook-form";

import { ControlledInput } from "@/components/form/ControlledInput";
import { SubmitButton } from "@/components/form/SubmitButton";
import { OnboardingLayout } from "@/components/layout/ScreenLayout";
import { Button } from "@/components/ui/Button";
import { useVerify } from "@/features/auth/hooks/useVerify";

export function VerifyScreen() {
  const { methods, handleVerify, handleResendCode, loading, email } =
    useVerify();

  return (
    <OnboardingLayout
      title="Verify Email"
      subtitle={`Please enter the code sent to ${email}`}
    >
      <FormProvider {...methods}>
        <ControlledInput
          name="otp"
          label="Verification Code"
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
        />

        <SubmitButton
          title="Verify & Sign In"
          onPress={handleVerify}
          isLoading={loading}
        />

        <Button
          title="Resend Code"
          onPress={() => {
            void handleResendCode();
          }}
          disabled={loading}
          variant="ghost"
          style={{ marginTop: 16 }}
        />
      </FormProvider>
    </OnboardingLayout>
  );
}
