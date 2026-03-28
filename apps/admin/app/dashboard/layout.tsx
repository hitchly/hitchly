import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DashboardAuthShell } from "@/app/dashboard/dashboard-auth-shell";

export const metadata: Metadata = {
  title: {
    template: "%s | Hitchly Admin",
    default: "Dashboard",
  },
  description:
    "Monitor live throughput, manage users, and audit safety reports.",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardAuthShell>{children}</DashboardAuthShell>;
}
