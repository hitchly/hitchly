import type { Metadata } from "next";

import UsersView from "@/app/dashboard/users/view";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage students, verify drivers, and audit account status.",
};

export default function UsersPage() {
  return <UsersView />;
}
