"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth";

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

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

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Hitchly Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage your ridesharing community.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <ModeToggle />
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium leading-none">
              {session?.user.name}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {session?.user.email}
            </span>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +19% from last month
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
