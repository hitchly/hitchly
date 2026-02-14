import type { SignUpInput } from "@hitchly/db";
import { signUpSchema } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";

import { ControlledInput, SubmitButton } from "@/components/ui/form";
import { OnboardingLayout } from "@/components/ui/screen-layout";
import { authClient } from "@/lib/auth-client";

export default function SignUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<SignUpInput> = async (data) => {
    setLoading(true);

    try {
      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: data.name,
        },
        {
          onSuccess: () => {
            router.push({
              pathname: "/verify",
              params: { email: data.email },
            });
          },
          onError: (ctx) => {
            Alert.alert("Registration Failed", ctx.error.message);
          },
        }
      );
    } catch {
      Alert.alert(
        "Registration Failed",
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOnPress = () => {
    const processSubmit = handleSubmit(onSubmit);
    processSubmit().catch(() => {
      // Handled by validation or catch block
    });
  };

  return (
    <OnboardingLayout
      title="Create Account"
      subtitle="Join the McMaster carpooling community."
    >
      <ControlledInput
        control={control}
        name="name"
        label="Full Name"
        placeholder="Jane Doe"
        autoCapitalize="words"
      />

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
        title="Create Account"
        onPress={handleOnPress}
        isPending={loading}
        disabled={loading}
      />
    </OnboardingLayout>
  );
}
