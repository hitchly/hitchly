import "server-only";

import { type AppRouter } from "@hitchly/api-types";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { cookies } from "next/headers";

export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.API_URL ?? "http://localhost:4000"}/trpc`,
      async headers() {
        const cookieStore = await cookies();
        return {
          Cookie: cookieStore.toString(),
          "x-trpc-source": "rsc",
        };
      },
    }),
  ],
});
