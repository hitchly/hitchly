import { verifyOtpSchema, type VerifyOtpInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";

import { Button } from "../../components/ui/button";
import { ControlledInput, SubmitButton } from "../../components/ui/form";
import { OnboardingLayout } from "../../components/ui/screen-layout";
import { authClient } from "../../lib/auth-client";

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

  const onVerify = async (data: VerifyOtpInput) => {
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
          router.replace("/(auth)/sign-in" as any);
        } else {
          router.replace("/");
        }
      } else {
        Alert.alert("Success", "Email verified! Please sign in.");
        router.replace("/(auth)/sign-in" as any);
      }
    } catch (err) {
      console.error("Unexpected Sign Up Error:", err);
      Alert.alert("Error", "An unexpected error occurred during verification");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (error) Alert.alert("Error", error.message);
      else Alert.alert("Sent", `A new code has been sent to ${email}`);
    } catch (err) {
      console.error("Resend Code Error:", err);
      Alert.alert("Error", "Could not resend code");
    } finally {
      setLoading(false);
    }
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
        onPress={handleSubmit(onVerify)}
        isPending={loading}
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
