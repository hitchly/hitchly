import { signUpSchema, type SignUpInput } from "@hitchly/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";

import { authClient } from "@/lib/auth-client";

export const useSignUp = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const methods = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignUpInput): Promise<void> => {
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

  const handleSignUp = (): void => {
    void methods.handleSubmit(onSubmit)();
  };

  return {
    methods,
    handleSignUp,
    loading,
  };
};
