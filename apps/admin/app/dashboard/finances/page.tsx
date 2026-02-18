import type { Metadata } from "next";

import FinancesView from "@/app/dashboard/finances/view";
import { api } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Finances",
  description: "Financial overview, revenue charts, and payout audits.",
};

export default async function FinancesPage() {
  const data = await api.admin.finances.metrics.query();

  return <FinancesView initialData={data} />;
}
