import type { Metadata } from "next";

import SafetyView from "@/app/dashboard/safety/view";
import { api } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Safety",
  description: "Incident reporting, safety protocols, and trust scores.",
};

export default async function SafetyPage() {
  const data = await api.admin.safety.metrics.query();

  return <SafetyView initialData={data} />;
}
