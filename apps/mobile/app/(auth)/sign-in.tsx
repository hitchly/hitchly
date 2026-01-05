import { useRouter } from "expo-router";
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

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      await authClient.signIn.email(
        {
          email,
          password,
        },
        {
          onSuccess: () => {
            // Root Layout detects session change
            // router.replace('/'); // Optional: explicit redirect if needed
          },
          onError: async (ctx) => {
            // Check for unverified email error
            if (
              ctx.error.code === "EMAIL_NOT_VERIFIED" ||
              ctx.error.message.includes("verified")
            ) {
              Alert.alert(
                "Verification Required",
                "Your account is not verified. We are sending a new code.",
                [{ text: "OK" }]
              );

              // 1. Resend the OTP
              await authClient.emailOtp.sendVerificationOtp({
                email,
                type: "email-verification",
              });

              // 2. Redirect to Verify screen
              router.push({
                pathname: "/verify",
                params: { email }, // Pass email to next screen
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
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="jane@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  form: { marginTop: 24 },
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
});
