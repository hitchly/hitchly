import { SignInInput, signInSchema } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";
import { ControlledInput, SubmitButton } from "../../components/ui/form";
import { OnboardingLayout } from "../../components/ui/screen-layout";
import { authClient } from "../../lib/auth-client";

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

  const onSubmit = async (data: SignInInput) => {
    setLoading(true);
    try {
      await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
        },
        {
          onSuccess: () => {
            // Root Layout handles redirect automatically
          },
          onError: async (ctx) => {
            if (
              ctx.error.code === "EMAIL_NOT_VERIFIED" ||
              ctx.error.message?.includes("verified")
            ) {
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
                pathname: "/verify" as any,
                params: { email: data.email, password: data.password },
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
    } catch (err) {
      console.error("Unexpected Sign In Error:", err);

      // #region agent log
      fetch(
        "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "app/(auth)/sign-in.tsx:onSubmit:catch",
            message: "Sign in network error",
            data: {
              errorMessage: err instanceof Error ? err.message : String(err),
              errorType:
                err instanceof Error ? err.constructor.name : typeof err,
              errorStack: err instanceof Error ? err.stack : undefined,
              email: data.email,
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "network-debug",
            hypothesisId: "D",
          }),
        }
      ).catch(() => {});
      // #endregion

      Alert.alert(
        "Login Failed",
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
        onPress={handleSubmit(onSubmit)}
        isPending={loading}
      />
    </OnboardingLayout>
  );
}
