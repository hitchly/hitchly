import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import DashboardLayoutView from "@/app/dashboard/layout-view";
import { authClient } from "@/lib/auth/client";

export const metadata: Metadata = {
  title: {
    template: "%s | Hitchly Admin",
    default: "Dashboard",
  },
  description:
    "Monitor live throughput, manage users, and audit safety reports.",
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { data: sessionData } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!sessionData) {
    return redirect("/sign-in");
  }

  return (
    <DashboardLayoutView session={sessionData}>{children}</DashboardLayoutView>
  );
}
