import type { Metadata } from "next";

import SafetyView from "@/app/dashboard/safety/view";

export const metadata: Metadata = {
  title: "Safety",
  description: "Incident reporting, safety protocols, and trust scores.",
};

export default function SafetyPage() {
  return <SafetyView />;
}
