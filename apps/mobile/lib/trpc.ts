import type { AppRouter } from "@hitchly/api-types";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";

import { authClient } from "./auth-client";

const getBaseUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
  return baseUrl;
};

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,

      headers() {
        const headers = new Map<string, string>();
        headers.set("Content-Type", "application/json");

        const cookie = authClient.getCookie();
        if (cookie) {
          headers.set("Cookie", cookie);
        }

        return Object.fromEntries(headers);
      },

      fetch: (url, options) => fetch(url, options),
    }),
  ],
});
