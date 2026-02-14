"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;

    if (session) {
      router.replace("/dashboard/operations");
    } else {
      router.replace("/sign-in");
    }
  }, [session, isPending, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs font-medium text-muted-foreground animate-pulse uppercase tracking-widest">
        Authenticating
      </p>
    </div>
  );
}
