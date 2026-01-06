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

// 1. Define Validation Schema
const signUpSchema = z.object({
  name: z.string().min(1, "Full Name is required"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .refine(
      (email) => email.endsWith("@mcmaster.ca"),
      "Only @mcmaster.ca emails are allowed"
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  // 2. Setup React Hook Form
  const { control, handleSubmit } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // 3. Handle Submission
  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);

    try {
      await authClient.signUp.email(
        {
          email: data.email,
          password: data.password,
          name: data.name,
        },
        {
          onSuccess: (ctx) => {
            console.log("Sign up successful", ctx);
            // Navigate to Verify and pass credentials
            router.push({
              pathname: "/verify",
              params: { email: data.email, password: data.password },
            });
          },
          onError: (ctx) => {
            Alert.alert("Registration Failed", ctx.error.message);
          },
        }
      );
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.form}>
        <Text style={[styles.title, { color: theme.text }]}>
          Create Account
        </Text>

        {/* 4. Use ControlledInput Components */}
        <View style={styles.inputGroup}>
          <ControlledInput
            control={control}
            name="name"
            label="Full Name"
            placeholder="Jane Doe"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <ControlledInput
            control={control}
            name="email"
            label="McMaster Email"
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
          title="Create Account"
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
