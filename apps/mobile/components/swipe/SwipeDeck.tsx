// TODO: Fix eslint errors in this file and re-enable linting
/* eslint-disable */

import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ViewStyle } from "react-native";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

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
    return obj.id ?? obj.rideId ?? "";
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
  const isMountedRef = useRef(true);
  const dataRef = useRef(data);

  useEffect(() => {
    isMountedRef.current = true;
    dataRef.current = data;
    return () => {
      isMountedRef.current = false;
    };
  }, [data]);

  // Shared animation values - must be declared before effects that use them
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  // Use shared value to store current card index (worklet-safe)
  const currentCardIndex = useSharedValue(0);

  // Track if swipe completion callback has been called (prevent multiple calls)
  const swipeCallbackCalled = useSharedValue(false);

  // Reset index when data changes significantly (e.g., after accepting a request)
  useEffect(() => {
    if (data.length === 0) {
      // Data is empty, reset to 0
      setCurrentIndex(0);
      setVisibleCards([]);
    } else if (currentIndex >= data.length) {
      // Current index is now past the end of data, reset to start
      setCurrentIndex(0);
      setVisibleCards(data.slice(0, 4));
      // Also reset animation values
      translateX.value = 0;
      translateY.value = 0;
      rotation.value = 0;
      opacity.value = 1;
      scale.value = 1;
    } else {
      // Normal case: update visible cards from current position
      const newVisible = data.slice(currentIndex, currentIndex + 4);
      setVisibleCards(newVisible);
    }
  }, [data, currentIndex, translateX, translateY, rotation, opacity, scale]);

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
          onSwipeRight(item);
        } else {
          onSwipeLeft(item);
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

    try {
      const gesture = Gesture.Pan()
        .activeOffsetX([-1, 1]) // Activate on any horizontal movement (very permissive)
        .onUpdate((event) => {
          "worklet";
          try {
            translateX.value = event.translationX;
            translateY.value = event.translationY * 0.1; // Less vertical movement
            rotation.value = (event.translationX / SCREEN_WIDTH) * ROTATION_MAX;
            opacity.value =
              1 - Math.abs(event.translationX) / (SCREEN_WIDTH * 0.5);
          } catch {
            // Reset to safe values on error
            translateX.value = 0;
            translateY.value = 0;
            rotation.value = 0;
            opacity.value = 1;
          }
        })
        .onEnd((event) => {
          "worklet";
          try {
            const absTranslationX = Math.abs(event.translationX);
            const velocityThreshold = 500;
            const tapThreshold = 20; // If movement is less than 20px, treat as tap

            // Check if this was a tap (very small movement)
            if (
              absTranslationX < tapThreshold &&
              Math.abs(event.velocityX) < 100
            ) {
              // Reset to center
              translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
              translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
              rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
              opacity.value = withSpring(1, { damping: 15, stiffness: 150 });

              // Trigger tap handler if provided - use current index to get card
              try {
                const idx = currentCardIndex.value;
                let cardId = "";
                // Safely access array
                if (idx >= 0 && idx < dataArrayLength && dataArray?.[idx]) {
                  const item = dataArray[idx];
                  if (item && typeof item === "object") {
                    const obj = item as Record<string, any>;
                    cardId = obj.id || obj.rideId || "";
                  }
                }
                if (cardId && onCardTapFn) {
                  runOnJS(
                    (
                      id: string,
                      dataArr: T[],
                      callback: ((item: T) => void) | undefined
                    ) => {
                      try {
                        if (!callback || !dataArr) return;
                        const foundItem = dataArr.find((d: T) => {
                          if (d && typeof d === "object") {
                            const obj = d as Record<string, any>;
                            return (obj.id ?? obj.rideId) === id;
                          }
                          return false;
                        });
                        if (foundItem) {
                          callback(foundItem);
                        }
                      } catch {
                        // Silently handle errors
                      }
                    }
                  )(cardId, dataArray, onCardTapFn);
                }
              } catch {
                // Silently handle tap errors
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
              // Spring back to center
              translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
              translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
              rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
              opacity.value = withSpring(1, { damping: 15, stiffness: 150 });
            }
          } catch {
            // Reset to center on error
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
            rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
            opacity.value = withSpring(1, { damping: 15, stiffness: 150 });
          }
        });

      return gesture;
    } catch {
      return null;
    }
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
  const leftOverlayStyle = useAnimatedStyle(() => {
    "worklet";
    try {
      const overlayOpacity =
        translateX.value < 0
          ? Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1) * 0.8
          : 0;
      return {
        opacity: overlayOpacity,
      };
    } catch {
      return { opacity: 0 };
    }
  });

  const rightOverlayStyle = useAnimatedStyle(() => {
    "worklet";
    try {
      const overlayOpacity =
        translateX.value > 0
          ? Math.min(translateX.value / SWIPE_THRESHOLD, 1) * 0.8
          : 0;
      return {
        opacity: overlayOpacity,
      };
    } catch {
      return { opacity: 0 };
    }
  });

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
