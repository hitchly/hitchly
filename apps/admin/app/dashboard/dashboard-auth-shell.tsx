"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";

import DashboardLayoutView from "@/app/dashboard/layout-view";
import { authClient } from "@/lib/auth/client";

function DashboardLoading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        Loading dashboard
      </p>
    </div>
  );
}

/**
 * Admin is on a different origin than the API (e.g. Vercel + Render). Session
 * cookies are set on the API host, so server-side getSession() on Vercel never
 * sees them. Auth must be checked client-side via useSession (credentialed fetch
 * to the API includes those cookies).
 */
export function DashboardAuthShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (!sessionData) {
      router.replace("/sign-in");
    }
  }, [isPending, sessionData, router]);

  if (isPending || !sessionData) {
    return <DashboardLoading />;
  }

  return (
    <DashboardLayoutView session={sessionData}>
      <Suspense fallback={<DashboardLoading />}>{children}</Suspense>
    </DashboardLayoutView>
  );
}
