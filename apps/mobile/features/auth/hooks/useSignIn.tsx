import { signInSchema, type SignInInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

export const useSignIn = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [loading, setLoading] = useState(false);

  const methods = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignInInput): Promise<void> => {
    setLoading(true);
    try {
      await authClient.signIn.email(
        { email: data.email, password: data.password },
        {
          onError: async (ctx) => {
            const errorMessage = ctx.error.message;
            const isUnverified =
              ctx.error.code === "EMAIL_NOT_VERIFIED" ||
              errorMessage.toLowerCase().includes("verified");

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
              Alert.alert("Login Failed", ctx.error.message);
            }
          },
          onSuccess: () => {
            queryClient.clear();
            void utils.invalidate();
          },
        }
      );
    } catch {
      Alert.alert("Login Failed", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = (): void => {
    void methods.handleSubmit(onSubmit)();
  };

  return {
    methods,
    handleSignIn,
    loading,
  };
};
