import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "api/trpc/routers";

// 👇 This points to your Express server
// On device/emulator you **cannot** use localhost.
// For Expo Go on Android use your LAN IP, e.g. http://192.168.1.42:3001/trpc
// On iOS Simulator you can use http://localhost:3001/trpc
const getBaseUrl = () => {
  if (__DEV__) {
    // change this to your LAN IP if using a device
    return "http://192.168.2.13:3000";
  }
  return "https://your-production-api.com";
};

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      headers() {
        return {
          "Content-Type": "application/json",
        };
      },
    }),
  ],
});
