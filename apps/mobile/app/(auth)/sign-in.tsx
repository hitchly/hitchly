import type { SignInInput } from "@hitchly/db";
import { signInSchema } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";

import { ControlledInput, SubmitButton } from "@/components/ui/form";
import { OnboardingLayout } from "@/components/ui/screen-layout";
import { authClient } from "@/lib/auth-client";

export default function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<SignInInput> = async (data) => {
    setLoading(true);
    try {
      await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
        },
        {
          onError: async (ctx) => {
            const isUnverified =
              ctx.error.code === "EMAIL_NOT_VERIFIED" ||
              ctx.error.message.toLowerCase().includes("verified");

            if (isUnverified) {
              Alert.alert(
                "Verification Required",
                "Your account is not verified. We are sending a new code.",
                [{ text: "OK" }]
              );

              await authClient.emailOtp.sendVerificationOtp({
                email: data.email,
                type: "email-verification",
              });

              router.push({
                pathname: "/verify",
                params: { email: data.email },
              });
            } else {
              Alert.alert(
                "Login Failed",
                ctx.error.message || "Invalid credentials"
              );
            }
          },
        }
      );
    } catch {
      Alert.alert(
        "Login Failed",
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOnPress = () => {
    const processSubmit = handleSubmit(onSubmit);
    processSubmit().catch(() => {
      // Handled by react-hook-form validation or internal catch
    });
  };

  return (
    <OnboardingLayout title="Sign In" subtitle="Welcome back to Hitchly.">
      <ControlledInput
        control={control}
        name="email"
        label="McMaster Email"
        placeholder="jane@mcmaster.ca"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <ControlledInput
        control={control}
        name="password"
        label="Password"
        placeholder="••••••••"
        secureTextEntry
      />

      <SubmitButton
        title="Sign In"
        onPress={handleOnPress}
        isPending={loading}
        disabled={loading}
      />
    </OnboardingLayout>
  );
}
