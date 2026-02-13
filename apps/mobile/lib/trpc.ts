import type { AppRouter } from "@hitchly/api-types";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";

import { authClient } from "./auth-client";

const getBaseUrl = () => {
  // Use environment variable if set, otherwise fallback to localhost
  // For Expo testing:
  // - iOS Simulator / Android Emulator / Web: Use localhost
  // - Physical Device: Use your computer's local IP address
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

  return baseUrl;
};

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();

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
          throw error;
        }
      },
    }),
  ],
});
