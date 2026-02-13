"use client";

import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`, // Point to Hono tRPC endpoint

          // CRITICAL: Pass auth cookies to Hono
          headers() {
            return {
              // specific headers if needed, but 'credentials: include' handles cookies
            };
          },
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include", // Ensure cookies (session) are sent to Hono
            });
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
