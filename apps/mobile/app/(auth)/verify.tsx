import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "../../components/ui/button";
import { ControlledInput } from "../../components/ui/form";
import { useTheme } from "../../context/theme-context";
import { authClient } from "../../lib/auth-client";

// 1. Validation Schema
const verifySchema = z.object({
  otp: z.string().length(6, "Verification code must be 6 digits"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function Verify() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  // We grab the email/password passed from the previous screen
  const { email, password } = useLocalSearchParams<{
    email: string;
    password?: string;
  }>();

  // 2. Setup Form
  const { control, handleSubmit } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { otp: "" },
  });

  // 3. Handle Verify & Auto-Login
  const onVerify = async (data: VerifyFormData) => {
    setLoading(true);
    try {
      // Step A: Verify Email
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp: data.otp,
      });

      if (verifyError) {
        Alert.alert("Verification Failed", verifyError.message);
        setLoading(false);
        return;
      }

      // Step B: Auto-Login if password exists
      if (password) {
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
        });

        if (signInError) {
          Alert.alert("Verified", "Email verified! Please sign in manually.");
          router.replace("/(auth)/sign-in");
        } else {
          // Success! Root layout will handle redirect to (app)
          router.replace("/");
        }
      } else {
        Alert.alert("Success", "Email verified! Please sign in.");
        router.replace("/(auth)/sign-in");
      }
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred");
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
      Alert.alert("Error", "Could not resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.form}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Verify Email
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Please enter the code sent to {email}
        </Text>

        {/* Form Input */}
        <View style={styles.inputGroup}>
          <ControlledInput
            control={control}
            name="otp"
            label="Verification Code"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <Button
          title="Verify & Sign In"
          onPress={handleSubmit(onVerify)}
          isLoading={loading}
          variant="primary"
          style={{ marginTop: 8 }}
        />

        <Button
          title="Resend Code"
          onPress={handleResendCode}
          disabled={loading}
          variant="ghost"
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
});
