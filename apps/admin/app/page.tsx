"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth";

export default function AdminDashboard() {
  const router = useRouter();

  const { data: session, isPending: isAuthPending } = authClient.useSession();

  useEffect(() => {
    if (!isAuthPending && !session) {
      router.push("/login");
    }
  }, [session, isAuthPending, router]);

  const handleSignOut = () => {
    authClient
      .signOut()
      .then(() => {
        router.push("/login");
        toast.success("Signed out successfully");
      })
      .catch(() => {
        toast.error("Failed to sign out. Please try again.");
      });
  };

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
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Hitchly Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your ridesharing community.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">{session.user.name}</span>
            <span className="text-xs text-muted-foreground">
              {session.user.email}
            </span>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
