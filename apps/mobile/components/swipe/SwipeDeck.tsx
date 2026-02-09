import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const SWIPE_THRESHOLD = 100;
const ROTATION_MAX = 15;

interface SwipeDeckProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  onSwipeLeft: (item: T) => void;
  onSwipeRight: (item: T) => void;
  onCardTap?: (item: T) => void;
  onDeckEmpty?: () => void;
  cardStyle?: ViewStyle;
}

const getItemId = <T,>(item: T): string => {
  if (typeof item === "object" && item !== null) {
    const obj = item as Record<string, any>;
    return obj.id || obj.rideId || "";
  }
  return "";
};

export function SwipeDeck<T extends { id?: string; rideId?: string }>({
  data,
  renderCard,
  onSwipeLeft,
  onSwipeRight,
  onCardTap,
  onDeckEmpty,
  cardStyle,
}: SwipeDeckProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState<T[]>(data.slice(0, 4));
  const isMountedRef = React.useRef(true);
  const dataRef = React.useRef(data);

  useEffect(() => {
    isMountedRef.current = true;
    dataRef.current = data;
    return () => {
      isMountedRef.current = false;
    };
  }, [data]);

  useEffect(() => {
    if (data.length > 0 && currentIndex < data.length) {
      setVisibleCards(data.slice(currentIndex, currentIndex + 4));
    }
  }, [data, currentIndex]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const currentCardIndex = useSharedValue(0);
  const swipeCallbackCalled = useSharedValue(false);

  useEffect(() => {
    currentCardIndex.value = currentIndex;
  }, [currentIndex, currentCardIndex]);

  const handleSwipeComplete = useCallback(
    (direction: "left" | "right", itemId: string) => {
      if (!isMountedRef.current) return;

      const currentData = dataRef.current;
      const item = currentData.find((d) => getItemId(d) === itemId);
      if (!item) return;

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Haptics unavailable
      }

      try {
        if (direction === "right") {
          onSwipeRight?.(item);
        } else {
          onSwipeLeft?.(item);
        }
      } catch {
        // Callback failed
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex >= currentData.length) {
        onDeckEmpty?.();
        return;
      }

      if (isMountedRef.current) {
        setCurrentIndex(nextIndex);
        setVisibleCards(currentData.slice(nextIndex, nextIndex + 4));
        currentCardIndex.value = nextIndex;
      }

      translateX.value = 0;
      translateY.value = 0;
      rotation.value = 0;
      opacity.value = 1;
      scale.value = 1;
    },
    [
      currentIndex,
      onSwipeLeft,
      onSwipeRight,
      onDeckEmpty,
      translateX,
      translateY,
      rotation,
      opacity,
      scale,
      currentCardIndex,
    ]
  );

  const panGesture = useMemo(() => {
    if (!Gesture || typeof Gesture.Pan !== "function") return null;

    const dataArray = Array.isArray(data) ? [...data] : [];
    const dataArrayLength = dataArray.length;
    const handleSwipeCompleteFn = handleSwipeComplete;
    const onCardTapFn = onCardTap;

    return Gesture.Pan()
      .activeOffsetX([-1, 1])
      .onUpdate((event) => {
        "worklet";
        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.1;
        rotation.value = (event.translationX / SCREEN_WIDTH) * ROTATION_MAX;
        opacity.value = 1 - Math.abs(event.translationX) / (SCREEN_WIDTH * 0.5);
      })
      .onEnd((event) => {
        "worklet";
        const absTranslationX = Math.abs(event.translationX);
        const velocityThreshold = 500;
        const tapThreshold = 20;

        if (absTranslationX < tapThreshold && Math.abs(event.velocityX) < 100) {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          rotation.value = withSpring(0);
          opacity.value = withSpring(1);

          const idx = currentCardIndex.value;
          if (idx >= 0 && idx < dataArrayLength && onCardTapFn) {
            const item = dataArray[idx];
            const cardId = item ? item.id || item.rideId || "" : "";
            if (cardId) {
              runOnJS((id: string, arr: T[], cb: (i: T) => void) => {
                const found = arr.find((d) => (d.id || d.rideId) === id);
                if (found) cb(found);
              })(cardId, dataArray, onCardTapFn);
            }
          }
          return;
        }

        const isLeft =
          event.translationX < -SWIPE_THRESHOLD ||
          (event.translationX < 0 && event.velocityX < -velocityThreshold);
        const isRight =
          event.translationX > SWIPE_THRESHOLD ||
          (event.translationX > 0 && event.velocityX > velocityThreshold);

        if (isLeft || isRight) {
          const idx = currentCardIndex.value;
          const cardIdToUse =
            idx >= 0 && idx < dataArrayLength
              ? dataArray[idx]?.id || dataArray[idx]?.rideId || ""
              : "";

          swipeCallbackCalled.value = false;
          translateX.value = withTiming(
            isLeft ? -SCREEN_WIDTH * 1.5 : SCREEN_WIDTH * 1.5,
            { duration: 300 },
            (finished) => {
              "worklet";
              if (!swipeCallbackCalled.value && finished && cardIdToUse) {
                swipeCallbackCalled.value = true;
                runOnJS(handleSwipeCompleteFn)(
                  isLeft ? "left" : "right",
                  cardIdToUse
                );
              }
            }
          );
          opacity.value = withTiming(0, { duration: 300 });
          scale.value = withTiming(0.8, { duration: 300 });
        } else {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          rotation.value = withSpring(0);
          opacity.value = withSpring(1);
        }
      });
  }, [
    handleSwipeComplete,
    onCardTap,
    data,
    currentCardIndex,
    translateX,
    translateY,
    rotation,
    opacity,
    scale,
    swipeCallbackCalled,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const getCardStyle = (index: number): ViewStyle => ({
    position: "absolute",
    width: CARD_WIDTH,
    transform: [{ scale: 1 - index * 0.05 }, { translateY: index * 8 }],
    zIndex: 4 - index,
  });

  if (data.length === 0 || currentIndex >= data.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.deckContainer}>
        {visibleCards.map((item, index) => {
          const isTopCard = index === 0;
          const itemId = getItemId(item);
          const content = (
            <Animated.View style={styles.cardWrapper} pointerEvents="box-none">
              {renderCard(item, currentIndex + index)}
              {isTopCard && <SwipeOverlay translateX={translateX} />}
            </Animated.View>
          );

          return (
            <Animated.View
              key={`${itemId}-${currentIndex + index}`}
              style={[
                getCardStyle(index),
                isTopCard && animatedStyle,
                cardStyle,
              ]}
              pointerEvents={isTopCard ? "auto" : "none"}
            >
              {isTopCard && panGesture ? (
                <GestureDetector gesture={panGesture}>
                  {content}
                </GestureDetector>
              ) : (
                content
              )}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function SwipeOverlay({ translateX }: { translateX: SharedValue<number> }) {
  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity:
      translateX.value < 0
        ? Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1) * 0.8
        : 0,
  }));

  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity:
      translateX.value > 0
        ? Math.min(translateX.value / SWIPE_THRESHOLD, 1) * 0.8
        : 0,
  }));

  return (
    <>
      <Animated.View
        style={[styles.overlay, styles.rejectOverlay, leftOverlayStyle]}
      >
        <Text style={styles.overlayText}>✕</Text>
      </Animated.View>
      <Animated.View
        style={[styles.overlay, styles.acceptOverlay, rightOverlayStyle]}
      >
        <Text style={styles.overlayText}>✓</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  deckContainer: { width: CARD_WIDTH, height: 500, position: "relative" },
  cardWrapper: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  rejectOverlay: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 4,
    borderColor: "#ef4444",
  },
  acceptOverlay: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderWidth: 4,
    borderColor: "#22c55e",
  },
  overlayText: { fontSize: 80, fontWeight: "bold", color: "#ffffff" },
});
