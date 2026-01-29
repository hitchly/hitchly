import { SignUpInput, signUpSchema } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";
import { ControlledInput, SubmitButton } from "../../components/ui/form";
import { OnboardingLayout } from "../../components/ui/screen-layout";
import { authClient } from "../../lib/auth-client";

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

  const onSubmit = async (data: SignUpInput) => {
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
              pathname: "/verify" as any,
              params: { email: data.email, password: data.password },
            });
          },
          onError: (ctx) => {
            Alert.alert("Registration Failed", ctx.error.message);
          },
        }
      );
    } catch (err) {
      console.error("Unexpected Sign Up Error:", err);
      Alert.alert(
        "Registration Failed",
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
        onPress={handleSubmit(onSubmit)}
        isPending={loading}
      />
    </OnboardingLayout>
  );
}
