"use client";

import { Loader2 } from "lucide-react"; // Import the loader icon
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth";

export default function AdminDashboard() {
  const router = useRouter();

  const {
    data: session,
    isPending: isAuthPending,
    error,
  } = authClient.useSession();

  useEffect(() => {
    if (isAuthPending) return;

    if (!session) {
      router.push("/login");
      return;
    }
  }, [session, isAuthPending, router]);

  if (isAuthPending || !session) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-2 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Hitchly Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">{session.user.name}</span>
            <span className="text-xs text-muted-foreground">
              {session.user.email}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await authClient.signOut();
              router.push("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <>
          <Skeleton className="h-30 rounded-xl" />
          <Skeleton className="h-30 rounded-xl" />
          <Skeleton className="h-30 rounded-xl" />
        </>
      </div>
    </div>
  );
}
