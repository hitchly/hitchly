import { Modal, View } from "react-native";

import { useTheme } from "@/context/theme-context";
import { Carousel } from "@/features/onboarding/components/Carousel";
import type { SlideData } from "@/features/onboarding/components/CarouselSlide";
import { useTutorialState } from "@/features/onboarding/hooks/useTutorialState";

const riderSlides: SlideData[] = [
  {
    id: "rider-1",
    title: "Welcome to Hitchly",
    description:
      "The exclusive ridesharing network for the McMaster University community. Skip the bus and ride with fellow students.",
    iconName: "car-sport-outline",
  },
  {
    id: "rider-2",
    title: "Find Your Ride",
    description:
      "Enter your destination and browse available cars leaving from campus, Hamilton, or the GTA.",
    iconName: "search-outline",
  },
  {
    id: "rider-3",
    title: "Request & Connect",
    description:
      "Request a seat and chat instantly with your driver to coordinate pickup spots like the Student Centre.",
    iconName: "chatbubbles-outline",
  },
  {
    id: "rider-4",
    title: "Safe & Verified",
    description:
      "Every user logs in with their MacID. You always know exactly who you are riding with.",
    iconName: "shield-checkmark-outline",
  },
];

export function RiderTutorial() {
  const { isVisible, handleComplete } = useTutorialState("rider");
  const { colors } = useTheme();

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        /* empty */
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Carousel slides={riderSlides} onComplete={handleComplete} />
      </View>
    </Modal>
  );
}
