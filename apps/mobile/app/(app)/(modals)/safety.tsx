import { useLocalSearchParams } from "expo-router";

import { SafetyScreen } from "@/features/safety/screens/SafetyScreen";

export default function SafetyRoute() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  return <SafetyScreen tripId={tripId} />;
}
