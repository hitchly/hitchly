"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/operations");
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground animate-pulse">
          Loading operations...
        </p>
      </div>
    </div>
  );
}
