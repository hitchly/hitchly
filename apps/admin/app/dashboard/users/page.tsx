import type { Metadata } from "next";

import UsersView from "@/app/dashboard/users/view";
import { api } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage students, verify drivers, and audit account status.",
};

export default async function UsersPage() {
  const data = await api.admin.users.metrics.query();

  return <UsersView initialData={data} />;
}
