import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "api/trpc/routers";
import { authClient } from "./auth-client";

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
      location: "lib/trpc.ts:getBaseUrl",
      message: "tRPC client base URL configuration",
      data: {
        baseUrl,
        trpcUrl: `${baseUrl}/trpc`,
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

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,

      async headers() {
        const headers = new Map<string, string>();
        headers.set("Content-Type", "application/json");

        const cookie = await authClient.getCookie();
        if (cookie) {
          headers.set("Cookie", cookie);
        }

        return Object.fromEntries(headers);
      },

      // Add error handling for network issues
      fetch: async (url, options) => {
        try {
          const response = await fetch(url, options);
          return response;
        } catch (error) {
          // #region agent log
          fetch(
            "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "lib/trpc.ts:fetch:error",
                message: "tRPC network request failed",
                data: {
                  url,
                  errorMessage:
                    error instanceof Error ? error.message : String(error),
                  errorType:
                    error instanceof Error
                      ? error.constructor.name
                      : typeof error,
                  configuredBaseUrl: getBaseUrl(),
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
          throw error;
        }
      },
    }),
  ],
});
