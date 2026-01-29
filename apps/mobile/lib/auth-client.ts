import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const getBaseUrl = () => {
  // Use environment variable if set, otherwise fallback to localhost
  // For Expo testing:
  // - iOS Simulator / Android Emulator / Web: Use localhost
  // - Physical Device: Use your computer's local IP address
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "lib/auth-client.ts:getBaseUrl",
      message: "Auth client base URL configuration",
      data: {
        baseUrl,
        hasEnvVar: !!process.env.EXPO_PUBLIC_API_URL,
        envVarValue: process.env.EXPO_PUBLIC_API_URL,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      sessionId: "debug-session",
      runId: "network-debug",
      hypothesisId: "D",
    }),
  }).catch(() => {});
  // #endregion

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
