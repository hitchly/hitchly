import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "api/trpc/routers";
import { authClient } from "./auth-client";

const getBaseUrl = () => {
  // Use environment variable if set, otherwise fallback to localhost
  // For Expo testing:
  // - iOS Simulator / Android Emulator / Web: Use localhost
  // - Physical Device: Use your computer's local IP address
  return process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
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
    }),
  ],
});
