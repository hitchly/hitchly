import type { Metadata } from "next";

import OperationsView from "@/app/dashboard/operations/view";
import { api } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Operations",
  description: "Live trip monitoring, hotspots, and system throughput.",
};

export default async function OperationsPage() {
  const data = await api.admin.ops.metrics.query();

  return <OperationsView initialData={data} />;
}
