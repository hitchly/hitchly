import { useRef, useState } from "react";
import type { ViewToken } from "react-native";
import { FlatList, View } from "react-native";

import { CarouselSlide, type SlideData } from "./CarouselSlide";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/context/theme-context";

interface CarouselProps {
  slides: SlideData[];
  onComplete: () => void;
}

export function Carousel({ slides, onComplete }: CarouselProps) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideData>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    // Background color tied to theme
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 3 }}>
        <FlatList<SlideData>
          ref={flatListRef}
          data={slides}
          renderItem={({ item }: { item: SlideData }) => (
            <CarouselSlide item={item} />
          )}
          keyExtractor={(item: SlideData) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      </View>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          justifyContent: "space-between",
          paddingBottom: 40,
        }}
      >
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}
        >
          {slides.map((_, index) => (
            <Badge
              label=""
              key={index}
              variant={currentIndex === index ? "default" : "secondary"}
              style={{ width: 10, height: 10, borderRadius: 5 }}
            />
          ))}
        </View>
        <View style={{ gap: 12 }}>
          <Button
            variant="primary"
            onPress={handleNext}
            title={currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          />
          {currentIndex !== slides.length - 1 && (
            <Button
              variant="ghost"
              onPress={handleSkip}
              title="Skip Tutorial"
            />
          )}
        </View>
      </View>
    </View>
  );
}
