import type { Metadata } from "next";

import FinancesView from "@/app/dashboard/finances/view";

export const metadata: Metadata = {
  title: "Finances",
  description: "Financial overview, revenue charts, and payout audits.",
};

export default function FinancesPage() {
  return <FinancesView />;
}
