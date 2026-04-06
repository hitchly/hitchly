import { useEffect, useState } from "react";

import { trpc } from "@/lib/trpc";

export function useTutorialState(mode: "rider" | "driver") {
  const { data: user } = trpc.profile.getMe.useQuery();
  const completeMutation = trpc.onboarding.completeTutorial.useMutation();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Show if the specific mode tutorial is NOT completed
    if (mode === "rider" && !user.riderTutorialCompleted) {
      setIsVisible(true);
    } else if (mode === "driver" && !user.driverTutorialCompleted) {
      setIsVisible(true);
    }
  }, [user, mode]);

  const handleComplete = () => {
    // 1. Optimistically hide the modal immediately
    setIsVisible(false);

    // 2. Fire the mutation in the background
    completeMutation.mutate({ mode });
  };

  return {
    isVisible,
    handleComplete,
  };
}
