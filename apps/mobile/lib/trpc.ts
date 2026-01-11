import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "api/trpc/routers";
import { authClient } from "./auth-client";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${process.env.EXPO_PUBLIC_API_URL}/trpc`,

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
