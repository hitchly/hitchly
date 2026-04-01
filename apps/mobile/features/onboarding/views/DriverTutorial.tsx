import { Modal, View } from "react-native";

import { useTheme } from "@/context/theme-context";
import { Carousel } from "@/features/onboarding/components/Carousel";
import type { SlideData } from "@/features/onboarding/components/CarouselSlide";
import { useTutorialState } from "@/features/onboarding/hooks/useTutorialState";

const driverSlides: SlideData[] = [
  {
    id: "driver-1",
    title: "Drive & Save",
    description:
      "Heading home for the weekend or commuting to campus? Offer your empty seats and split the gas costs.",
    iconName: "wallet-outline",
  },
  {
    id: "driver-2",
    title: "Post Your Route",
    description:
      "Set your departure time, starting point, and how many seats you have available in your vehicle.",
    iconName: "map-outline",
  },
  {
    id: "driver-3",
    title: "Manage Requests",
    description:
      "Review rider profiles before accepting. You are always in full control of who gets in your car.",
    iconName: "people-outline",
  },
  {
    id: "driver-4",
    title: "Hit the Road",
    description:
      "Use the built-in trip monitor to navigate, communicate with your riders, and complete the journey safely.",
    iconName: "navigate-circle-outline",
  },
];

export function DriverTutorial() {
  const { isVisible, handleComplete } = useTutorialState("driver");
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
        <Carousel slides={driverSlides} onComplete={handleComplete} />
      </View>
    </Modal>
  );
}
