import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authClient } from "../../lib/auth-client";

export default function Verify() {
  // We grab the password passed from the Register screen
  const { email, password } = useLocalSearchParams<{
    email: string;
    password?: string;
  }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      // ---------------------------------------------------------
      // Step 1: Verify the Email
      // ---------------------------------------------------------
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });

      if (verifyError) {
        Alert.alert("Verification Failed", verifyError.message);
        setLoading(false);
        return;
      }

      // ---------------------------------------------------------
      // Step 2: Auto-Login (Behind the Scenes)
      // ---------------------------------------------------------
      if (password) {
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
        });

        if (signInError) {
          // Rare edge case: Verified but login failed (maybe changed password?)
          Alert.alert("Verified", "Email verified! Please sign in manually.");
          router.replace("/sign-in");
        } else {
          // Success! Verified AND Logged in.
          router.replace("/");
        }
      } else {
        // Fallback: If for some reason we don't have the password (e.g. user restarted app)
        Alert.alert("Success", "Email verified! Please sign in.");
        router.replace("/sign-in");
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
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.headerTitle}>Verify Email</Text>
        <Text style={styles.subtitle}>
          Please enter the code sent to {email}
        </Text>

        <Text style={styles.label}>Verification Code</Text>
        <TextInput
          style={styles.input}
          placeholder="123456"
          keyboardType="number-pad"
          autoCapitalize="none"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify & Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResendCode}
          disabled={loading}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Resend Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  form: { marginTop: 24 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 32 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  linkButton: { alignItems: "center", marginTop: 20 },
  linkText: { color: "#007AFF", fontSize: 16 },
});
