import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const getBaseUrl = () => {
  // Use environment variable if set, otherwise fallback to localhost
  // For Expo testing:
  // - iOS Simulator / Android Emulator / Web: Use localhost
  // - Physical Device: Use your computer's local IP address
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

  return baseUrl;
};

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),

  fetchOptions: {
    headers: {
      Origin: "mobile://",
    },
  },

  plugins: [
    expoClient({
      scheme: "mobile",
      storagePrefix: "mobile",
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});
