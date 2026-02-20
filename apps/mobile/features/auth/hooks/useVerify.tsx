import { verifyOtpSchema, type VerifyOtpInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";

export const useVerify = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { email, password } = useLocalSearchParams<{
    email: string;
    password?: string;
  }>();

  const methods = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: "" },
  });

  const onVerify = async (data: VerifyOtpInput): Promise<void> => {
    setLoading(true);
    try {
      // 1. Verify the OTP
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email: email,
        otp: data.otp,
      });

      if (verifyError) {
        Alert.alert(
          "Verification Failed",
          verifyError.message ?? "Invalid code"
        );
        setLoading(false);
        return;
      }

      // 2. If password exists, auto-login
      if (password) {
        const { error: signInError } = await authClient.signIn.email({
          email: email,
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

  const handleVerify = (): void => {
    void methods.handleSubmit(onVerify)();
  };

  const handleResendCode = async (): Promise<void> => {
    try {
      setLoading(true);
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email,
        type: "email-verification",
      });

      if (error) {
        Alert.alert("Error", error.message ?? "Failed to resend");
      } else {
        Alert.alert("Sent", `A new code has been sent to ${email}`);
      }
    } catch {
      Alert.alert("Error", "Could not resend code");
    } finally {
      setLoading(false);
    }
  };

  return {
    methods,
    handleVerify,
    handleResendCode,
    loading,
    email: email,
  };
};
