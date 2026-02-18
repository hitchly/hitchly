import type { Metadata } from "next";

import HealthView from "@/app/dashboard/health/view";
import { api } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Health",
};

export default async function HealthPage() {
  const data = await api.admin.infra.metrics.query();

  return <HealthView initialData={data} />;
}
