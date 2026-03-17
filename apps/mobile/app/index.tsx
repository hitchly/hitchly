import { Redirect } from "expo-router";

import { authClient } from "@/lib/auth-client";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  if (session) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)" />;
}
