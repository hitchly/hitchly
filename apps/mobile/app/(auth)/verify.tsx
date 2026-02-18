import { verifyOtpSchema, type VerifyOtpInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";

import { Button } from "@/components/ui/button";
import { ControlledInput, SubmitButton } from "@/components/ui/form";
import { OnboardingLayout } from "@/components/ui/screen-layout";
import { authClient } from "@/lib/auth-client";

export default function Verify() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { email, password } = useLocalSearchParams<{
    email: string;
    password?: string;
  }>();

  const { control, handleSubmit } = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: "" },
  });

  const onVerify: SubmitHandler<VerifyOtpInput> = async (data) => {
    setLoading(true);
    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp: data.otp,
      });

      if (verifyError) {
        Alert.alert("Verification Failed", verifyError.message);
        setLoading(false);
        return;
      }

      if (password) {
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
        });

        if (signInError) {
          Alert.alert("Verified", "Email verified! Please sign in manually.");
          router.replace("/(auth)/sign-in");
        } else {
          router.replace("/");
        }
      } else {
        Alert.alert("Success", "Email verified! Please sign in.");
        router.replace("/(auth)/sign-in");
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred during verification");
    } finally {
      setLoading(false);
    }
  };

  const handleOnPress = () => {
    const processSubmit = handleSubmit(onVerify);
    processSubmit().catch(() => {
      // Logic handled by validation or catch block
    });
  };

  const handleResendCode = () => {
    const performResend = async () => {
      try {
        setLoading(true);
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "email-verification",
        });

        if (error) {
          Alert.alert("Error", error.message);
        } else {
          Alert.alert("Sent", `A new code has been sent to ${email}`);
        }
      } catch {
        Alert.alert("Error", "Could not resend code");
      } finally {
        setLoading(false);
      }
    };

    performResend().catch(() => {
      // Handled by internal catch
    });
  };

  return (
    <OnboardingLayout
      title="Verify Email"
      subtitle={`Please enter the code sent to ${email}`}
    >
      <ControlledInput
        control={control}
        name="otp"
        label="Verification Code"
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
      />

      <SubmitButton
        title="Verify & Sign In"
        onPress={handleOnPress}
        isPending={loading}
        disabled={loading}
      />

      <Button
        title="Resend Code"
        onPress={handleResendCode}
        disabled={loading}
        variant="ghost"
        style={{ marginTop: 16 }}
      />
    </OnboardingLayout>
  );
}
