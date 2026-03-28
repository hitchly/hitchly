import type { Metadata } from "next";

import OperationsView from "@/app/dashboard/operations/view";

export const metadata: Metadata = {
  title: "Operations",
  description: "Live trip monitoring, hotspots, and system throughput.",
};

export default function OperationsPage() {
  return <OperationsView />;
}
