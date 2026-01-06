import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "../../components/ui/button";
import { ControlledInput } from "../../components/ui/form";
import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";

// 1. Define Validation Schema (Added McMaster check)
const signInSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .refine(
      (email) => email.endsWith("@mcmaster.ca"),
      "Only @mcmaster.ca emails are allowed"
    ),
  password: z.string().min(1, "Password is required"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignIn() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 2. Setup React Hook Form
  const { control, handleSubmit } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 3. Handle Submission
  const onSubmit = async (data: SignInFormData) => {
    setLoading(true);
    try {
      await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
        },
        {
          onSuccess: () => {
            // Root Layout handles redirect
          },
          onError: async (ctx) => {
            if (
              ctx.error.code === "EMAIL_NOT_VERIFIED" ||
              ctx.error.message.includes("verified")
            ) {
              Alert.alert(
                "Verification Required",
                "Your account is not verified. We are sending a new code.",
                [{ text: "OK" }]
              );

              // Resend OTP
              await authClient.emailOtp.sendVerificationOtp({
                email: data.email,
                type: "email-verification",
              });

              // Redirect
              router.push({
                pathname: "/verify",
                params: { email: data.email, password: data.password },
              });
            } else {
              Alert.alert("Login Failed", ctx.error.message);
            }
          },
        }
      );
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.form}>
        <Text style={[styles.title, { color: theme.text }]}>Sign In</Text>

        {/* 4. Use ControlledInput Components */}
        <View style={styles.inputGroup}>
          <ControlledInput
            control={control}
            name="email"
            label="McMaster Email" // Updated Label
            placeholder="jane@mcmaster.ca"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <ControlledInput
            control={control}
            name="password"
            label="Password"
            placeholder="••••••••"
            secureTextEntry
          />
        </View>

        <Button
          title="Sign In"
          onPress={handleSubmit(onSubmit)}
          isLoading={loading}
          variant="primary"
          style={{ marginTop: 16 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  form: {
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
});
