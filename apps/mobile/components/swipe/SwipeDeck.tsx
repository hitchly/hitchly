/* eslint-disable no-console */
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

// #region agent log
const LOG_ENDPOINT =
  "http://127.0.0.1:7245/ingest/4d4f28b1-5b37-45a9-bef5-bfd2cc5ef3c9";
const getTimestamp = () => new Date().toISOString();
const log = (
  location: string,
  message: string,
  data: any,
  hypothesisId?: string
) => {
  const timestamp = Date.now();
  const logData = {
    location,
    message,
    data,
    timestamp,
    timestampISO: getTimestamp(),
    sessionId: "debug-session",
    hypothesisId,
  };
  // Console fallback for debugging with timestamp
  console.log(
    `[${getTimestamp()}] [DEBUG ${hypothesisId || "?"}] ${location}: ${message}`,
    data
  );
  fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logData),
  }).catch(() => {});
};
// #endregion

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

// Helper to get item ID (supports both 'id' and 'rideId')
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

  // Track if component is mounted and keep data reference
  React.useEffect(() => {
    isMountedRef.current = true;
    dataRef.current = data;
    return () => {
      isMountedRef.current = false;
    };
  }, [data]);

  // Update visible cards when data changes
  useEffect(() => {
    if (data.length > 0 && currentIndex < data.length) {
      const newVisible = data.slice(currentIndex, currentIndex + 4);
      setVisibleCards(newVisible);
      // #region agent log
      log(
        "SwipeDeck.tsx:useEffect",
        "Visible cards updated",
        {
          currentIndex,
          newVisibleLength: newVisible.length,
          firstCardId: newVisible[0] ? getItemId(newVisible[0]) : undefined,
          allCardIds: newVisible.map((c) => getItemId(c)),
          timestamp: Date.now(),
        },
        "D"
      );
      // #endregion
    }
  }, [data, currentIndex]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  // Use shared value to store current card index (worklet-safe)
  const currentCardIndex = useSharedValue(0);

  // Track if swipe completion callback has been called (prevent multiple calls)
  const swipeCallbackCalled = useSharedValue(false);

  // Keep shared value in sync with state
  useEffect(() => {
    currentCardIndex.value = currentIndex;
  }, [currentIndex]);

  const handleSwipeComplete = useCallback(
    (direction: "left" | "right", itemId: string) => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.log(
          "[DEBUG] Component unmounted, skipping handleSwipeComplete"
        );
        return;
      }

      try {
        // #region agent log
        log(
          "SwipeDeck.tsx:handleSwipeComplete",
          "Swipe complete - START",
          {
            direction,
            itemId,
            currentIndex,
            dataLength: data.length,
            isMounted: isMountedRef.current,
            timestamp: Date.now(),
          },
          "B"
        );
        // #endregion

        // Use ref to get current data to avoid stale closure issues
        const currentData = dataRef.current;

        // Find the item by ID from current data (supports both id and rideId)
        const item = currentData.find((d) => getItemId(d) === itemId);
        if (!item) {
          log(
            "SwipeDeck.tsx:handleSwipeComplete",
            "Item not found",
            { itemId, dataLength: currentData.length },
            "B"
          );
          return;
        }

        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (hapticError) {
          // Haptics might not be available, ignore
          console.warn("Haptics error:", hapticError);
        }

        // Call callbacks first, but don't let errors stop state updates
        try {
          if (direction === "right") {
            if (onSwipeRight) {
              onSwipeRight(item);
            }
          } else {
            if (onSwipeLeft) {
              onSwipeLeft(item);
            }
          }
        } catch (callbackError) {
          log(
            "SwipeDeck.tsx:handleSwipeComplete",
            "Error in swipe callback",
            {
              error:
                callbackError instanceof Error
                  ? callbackError.message
                  : String(callbackError),
              direction,
              itemId,
            },
            "B"
          );
          // Don't rethrow - continue with state update
        }

        // Move to next card - use ref to get current data length
        const currentDataLength = dataRef.current.length;
        const nextIndex = currentIndex + 1;
        if (nextIndex >= currentDataLength) {
          if (onDeckEmpty && isMountedRef.current) {
            onDeckEmpty();
          }
          return;
        }

        // #region agent log
        log(
          "SwipeDeck.tsx:handleSwipeComplete",
          "About to update state",
          {
            currentIndex,
            nextIndex,
            isMounted: isMountedRef.current,
            timestamp: Date.now(),
          },
          "D"
        );
        // #endregion

        // Check again if component is still mounted before updating state
        if (!isMountedRef.current) {
          console.log(
            "[DEBUG] Component unmounted before state update, skipping"
          );
          return;
        }

        // Update state first - wrap in try-catch to prevent crashes
        try {
          // Use ref to get current data to avoid stale closure issues
          const currentDataForUpdate = dataRef.current;

          // Validate that nextIndex is still valid for current data
          if (nextIndex < 0 || nextIndex > currentDataForUpdate.length) {
            log(
              "SwipeDeck.tsx:handleSwipeComplete",
              "Invalid nextIndex, skipping state update",
              {
                nextIndex,
                dataLength: currentDataForUpdate.length,
                currentIndex,
              },
              "B"
            );
            return;
          }

          // Update state synchronously - React will batch updates
          if (isMountedRef.current) {
            setCurrentIndex(nextIndex);
            const newVisible = currentDataForUpdate.slice(
              nextIndex,
              nextIndex + 4
            );
            setVisibleCards(newVisible);

            // Update shared value immediately so gesture handlers use correct index
            currentCardIndex.value = nextIndex;

            // #region agent log
            log(
              "SwipeDeck.tsx:handleSwipeComplete",
              "State updated, resetting animation",
              {
                nextIndex,
                newVisibleLength: newVisible.length,
                firstCardId: newVisible[0]
                  ? getItemId(newVisible[0])
                  : undefined,
                allCardIds: newVisible.map((c: T) => getItemId(c)),
                currentCardIndexValue: currentCardIndex.value,
                translateXBefore: translateX.value,
                translateYBefore: translateY.value,
                timestamp: Date.now(),
              },
              "D"
            );
            // #endregion
          }
        } catch (stateError) {
          log(
            "SwipeDeck.tsx:handleSwipeComplete",
            "Error preparing state update",
            {
              error:
                stateError instanceof Error
                  ? stateError.message
                  : String(stateError),
              nextIndex,
              isMounted: isMountedRef.current,
            },
            "B"
          );
          // Try to at least update the shared value
          try {
            if (isMountedRef.current) {
              currentCardIndex.value = nextIndex;
            }
          } catch {
            // If even this fails, we're in a bad state
          }
          return;
        }

        // Reset animation values immediately - the previous card is off-screen
        // The new top card needs fresh animation values to respond to gestures
        translateX.value = 0;
        translateY.value = 0;
        rotation.value = 0;
        opacity.value = 1;
        scale.value = 1;

        // #region agent log
        log(
          "SwipeDeck.tsx:handleSwipeComplete",
          "Animation values reset",
          {
            nextIndex,
            translateXAfter: translateX.value,
            translateYAfter: translateY.value,
            timestamp: Date.now(),
          },
          "D"
        );
        // #endregion
      } catch (error) {
        log(
          "SwipeDeck.tsx:handleSwipeComplete",
          "Error in handleSwipeComplete",
          {
            error: error instanceof Error ? error.message : String(error),
          },
          "B"
        );
      }
    },
    [
      currentIndex,
      data,
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

  // #region agent log
  useEffect(() => {
    log(
      "SwipeDeck.tsx:98",
      "Checking Gesture import",
      {
        GestureExists: typeof Gesture !== "undefined",
        GesturePanExists: typeof Gesture?.Pan === "function",
        GestureType: typeof Gesture,
      },
      "A"
    );
  }, []);
  // #endregion

  // #region agent log
  const panGesture = useMemo(() => {
    log(
      "SwipeDeck.tsx:useMemo",
      "Creating panGesture - START",
      {
        GestureExists: typeof Gesture !== "undefined",
        GesturePanExists: typeof Gesture?.Pan === "function",
        GestureType: typeof Gesture,
        currentIndex,
        currentCardIndexValue: currentCardIndex.value,
        dataLength: data.length,
        timestamp: Date.now(),
      },
      "E"
    );

    if (!Gesture || typeof Gesture.Pan !== "function") {
      log(
        "SwipeDeck.tsx:130",
        "Gesture.Pan is not available",
        {
          Gesture: Gesture,
          GestureType: typeof Gesture,
        },
        "A"
      );
      return null;
    }

    // Capture data array and callbacks for worklet closure
    const dataArray = data;
    const handleSwipeCompleteFn = handleSwipeComplete;
    const onCardTapFn = onCardTap;

    try {
      const gesture = Gesture.Pan()
        .activeOffsetX([-1, 1]) // Activate on any horizontal movement (very permissive)
        .onBegin(() => {
          // #region agent log
          const ts = Date.now();
          console.log(
            `[${new Date(ts).toISOString()}] [DEBUG B] Pan gesture began (finger down)`,
            {
              currentCardIndex: currentCardIndex.value,
              timestamp: ts,
            }
          );
          // #endregion
        })
        .onStart(() => {
          // #region agent log
          const ts = Date.now();
          console.log(
            `[${new Date(ts).toISOString()}] [DEBUG B] Pan gesture started (activated)`,
            {
              currentCardIndex: currentCardIndex.value,
              timestamp: ts,
            }
          );
          // #endregion
        })
        .onUpdate((event) => {
          // #region agent log
          const ts = Date.now();
          console.log(
            `[${new Date(ts).toISOString()}] [DEBUG B] Pan gesture update`,
            {
              translationX: event.translationX,
              translationY: event.translationY,
              currentCardIndex: currentCardIndex.value,
              timestamp: ts,
            }
          );
          // #endregion
          try {
            translateX.value = event.translationX;
            translateY.value = event.translationY * 0.1; // Less vertical movement
            rotation.value = (event.translationX / SCREEN_WIDTH) * ROTATION_MAX;
            opacity.value =
              1 - Math.abs(event.translationX) / (SCREEN_WIDTH * 0.5);
          } catch (error) {
            console.error("[DEBUG B] Error in onUpdate:", error);
          }
        })
        .onEnd((event) => {
          // #region agent log
          const ts = Date.now();
          console.log(
            `[${new Date(ts).toISOString()}] [DEBUG B] Pan gesture ended`,
            {
              translationX: event.translationX,
              velocityX: event.velocityX,
              currentCardIndex: currentCardIndex.value,
              timestamp: ts,
            }
          );
          // Note: log() removed from worklet to avoid serialization issues
          // #endregion
          try {
            const absTranslationX = Math.abs(event.translationX);
            const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;
            const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;
            const velocityThreshold = 500;
            const tapThreshold = 20; // If movement is less than 20px, treat as tap

            // Check if this was a tap (very small movement)
            if (
              absTranslationX < tapThreshold &&
              Math.abs(event.velocityX) < 100
            ) {
              // #region agent log
              const ts = Date.now();
              console.log(
                `[${new Date(ts).toISOString()}] [DEBUG B] Detected tap (small movement)`,
                {
                  currentCardIndex: currentCardIndex.value,
                  timestamp: ts,
                }
              );
              // #endregion
              // Reset to center
              translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
              translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
              rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
              opacity.value = withSpring(1, { damping: 15, stiffness: 150 });
              // Trigger tap handler if provided - use current index to get card
              // Only pass ID to avoid passing objects with refs through worklet boundary
              const idx = currentCardIndex.value;
              if (onCardTapFn && idx >= 0 && idx < dataArray.length) {
                const item = dataArray[idx];
                // Worklet-safe ID extraction (inline check, no function call)
                let cardId = "";
                if (item && typeof item === "object") {
                  const obj = item as Record<string, any>;
                  cardId = obj.id || obj.rideId || "";
                }
                if (cardId) {
                  // Create a safe callback - use captured values from closure
                  runOnJS(
                    (
                      id: string,
                      dataArr: T[],
                      callback: ((item: T) => void) | undefined
                    ) => {
                      try {
                        if (!callback || !dataArr) return;
                        // Find item by ID (worklet-safe inline check in JS thread)
                        const foundItem = dataArr.find((d: T) => {
                          if (d && typeof d === "object") {
                            const obj = d as Record<string, any>;
                            return (obj.id || obj.rideId) === id;
                          }
                          return false;
                        });
                        if (foundItem) {
                          callback(foundItem);
                        }
                      } catch (err) {
                        console.error("[DEBUG B] Error in tap callback:", err);
                      }
                    }
                  )(cardId, dataArray, onCardTapFn);
                }
              }
              return;
            }

            if (
              shouldSwipeLeft ||
              (event.translationX < 0 && event.velocityX < -velocityThreshold)
            ) {
              // Swipe left
              // #region agent log
              const ts = Date.now();
              console.log(
                `[${new Date(ts).toISOString()}] [DEBUG B] Swipe left detected`,
                {
                  translationX: event.translationX,
                  currentCardIndex: currentCardIndex.value,
                  timestamp: ts,
                }
              );
              // #endregion
              // Extract cardId BEFORE animation (worklet-safe)
              const idx = currentCardIndex.value;
              let cardIdToUse = "";
              if (idx >= 0 && idx < dataArray.length) {
                const item = dataArray[idx];
                // Worklet-safe ID extraction (inline check, no function call)
                if (item && typeof item === "object") {
                  const obj = item as Record<string, any>;
                  cardIdToUse = obj.id || obj.rideId || "";
                }
              }
              // Reset callback flag before starting animation
              swipeCallbackCalled.value = false;
              translateX.value = withTiming(
                -SCREEN_WIDTH * 1.5,
                { duration: 300 },
                (finished) => {
                  if (swipeCallbackCalled.value) {
                    console.log(
                      "[DEBUG B] Animation callback already called, skipping"
                    );
                    return;
                  }
                  swipeCallbackCalled.value = true;

                  const ts = Date.now();
                  console.log(
                    `[${new Date(ts).toISOString()}] [DEBUG B] Animation callback (left)`,
                    {
                      finished,
                      currentCardIndex: currentCardIndex.value,
                      cardIdToUse,
                      hasHandleSwipeCompleteFn: !!handleSwipeCompleteFn,
                      timestamp: ts,
                    }
                  );
                  if (finished && cardIdToUse && handleSwipeCompleteFn) {
                    console.log(
                      `[${new Date(Date.now()).toISOString()}] [DEBUG B] Calling handleSwipeComplete (left)`,
                      {
                        cardId: cardIdToUse,
                        idx,
                        timestamp: Date.now(),
                      }
                    );
                    // Call directly - handleSwipeCompleteFn already has error handling
                    runOnJS(handleSwipeCompleteFn)("left", cardIdToUse);
                  } else {
                    console.log(
                      `[${new Date(Date.now()).toISOString()}] [DEBUG B] Animation callback skipped`,
                      {
                        finished,
                        hasCardId: !!cardIdToUse,
                        hasHandleSwipeCompleteFn: !!handleSwipeCompleteFn,
                        timestamp: Date.now(),
                      }
                    );
                  }
                }
              );
              opacity.value = withTiming(0, { duration: 300 });
              scale.value = withTiming(0.8, { duration: 300 });
            } else if (
              shouldSwipeRight ||
              (event.translationX > 0 && event.velocityX > velocityThreshold)
            ) {
              // Swipe right
              // #region agent log
              const ts = Date.now();
              console.log(
                `[${new Date(ts).toISOString()}] [DEBUG B] Swipe right detected`,
                {
                  translationX: event.translationX,
                  currentCardIndex: currentCardIndex.value,
                  timestamp: ts,
                }
              );
              // #endregion
              // Extract cardId BEFORE animation (worklet-safe)
              const idx = currentCardIndex.value;
              let cardIdToUse = "";
              if (idx >= 0 && idx < dataArray.length) {
                const item = dataArray[idx];
                // Worklet-safe ID extraction (inline check, no function call)
                if (item && typeof item === "object") {
                  const obj = item as Record<string, any>;
                  cardIdToUse = obj.id || obj.rideId || "";
                }
              }
              // Reset callback flag before starting animation
              swipeCallbackCalled.value = false;
              translateX.value = withTiming(
                SCREEN_WIDTH * 1.5,
                { duration: 300 },
                (finished) => {
                  if (swipeCallbackCalled.value) {
                    console.log(
                      "[DEBUG B] Animation callback already called, skipping"
                    );
                    return;
                  }
                  swipeCallbackCalled.value = true;

                  const ts = Date.now();
                  console.log(
                    `[${new Date(ts).toISOString()}] [DEBUG B] Animation callback (right)`,
                    {
                      finished,
                      currentCardIndex: currentCardIndex.value,
                      cardIdToUse,
                      hasHandleSwipeCompleteFn: !!handleSwipeCompleteFn,
                      timestamp: ts,
                    }
                  );
                  if (finished && cardIdToUse && handleSwipeCompleteFn) {
                    console.log(
                      `[${new Date(Date.now()).toISOString()}] [DEBUG B] Calling handleSwipeComplete (right)`,
                      {
                        cardId: cardIdToUse,
                        idx,
                        timestamp: Date.now(),
                      }
                    );
                    // Call directly - handleSwipeCompleteFn already has error handling
                    runOnJS(handleSwipeCompleteFn)("right", cardIdToUse);
                  } else {
                    console.log(
                      `[${new Date(Date.now()).toISOString()}] [DEBUG B] Animation callback skipped`,
                      {
                        finished,
                        hasCardId: !!cardIdToUse,
                        hasHandleSwipeCompleteFn: !!handleSwipeCompleteFn,
                        timestamp: Date.now(),
                      }
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
          } catch (error) {
            console.error("[DEBUG B] Error in onEnd:", error);
            // Reset to center on error
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
            translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
            rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
            opacity.value = withSpring(1, { damping: 15, stiffness: 150 });
          }
        });
      // Note: onCancel is not available in this version of react-native-gesture-handler
      // The gesture will reset in onEnd if movement is below threshold

      log(
        "SwipeDeck.tsx:useMemo",
        "panGesture created successfully - END",
        {
          gestureType: typeof gesture,
          gestureExists: !!gesture,
          hasToGestureArray: typeof gesture?.toGestureArray === "function",
          gestureKeys: gesture ? Object.keys(gesture) : [],
          currentIndex,
          currentCardIndexValue: currentCardIndex.value,
          timestamp: Date.now(),
        },
        "E"
      );
      return gesture;
    } catch (error) {
      log(
        "SwipeDeck.tsx:130",
        "Error creating panGesture",
        {
          error: error instanceof Error ? error.message : String(error),
          errorType: typeof error,
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        "A"
      );
      return null;
    }
    // Recreate when dependencies change
    // NOTE: We intentionally don't include currentIndex here to avoid recreating
    // the gesture on every swipe. Instead, we use currentCardIndex shared value
    // which is updated synchronously in handleSwipeComplete
  }, [handleSwipeComplete, onCardTap, data]);
  // #endregion

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  const getCardStyle = (index: number): ViewStyle => {
    const offset = index * 8;
    const scale = 1 - index * 0.05;
    return {
      position: "absolute",
      width: CARD_WIDTH,
      transform: [{ scale }, { translateY: offset }],
      zIndex: 4 - index,
    };
  };

  if (data.length === 0 || currentIndex >= data.length) {
    return null;
  }

  // #region agent log
  // Log panGesture state before rendering
  log(
    "SwipeDeck.tsx:255",
    "Before render check",
    {
      panGestureExists: !!panGesture,
      panGestureType: typeof panGesture,
      panGestureIsNull: panGesture === null,
      panGestureIsUndefined: panGesture === undefined,
      visibleCardsLength: visibleCards.length,
    },
    "C"
  );
  // #endregion

  return (
    <View style={styles.container}>
      <View style={styles.deckContainer}>
        {visibleCards.map((item, index) => {
          const isTopCard = index === 0;
          // #region agent log
          log(
            "SwipeDeck.tsx:268",
            "Rendering card",
            {
              index,
              isTopCard,
              cardId: getItemId(item),
              currentIndex,
              actualCardIndex: currentIndex + index,
              panGestureExists: !!panGesture,
              panGestureType: typeof panGesture,
              panGestureIsNull: panGesture === null,
              visibleCardsLength: visibleCards.length,
              timestamp: Date.now(),
            },
            "C"
          );
          // #endregion

          // Determine the gesture to pass - never pass null
          const gestureToPass =
            isTopCard && panGesture ? panGesture : undefined;

          // #region agent log
          log(
            "SwipeDeck.tsx:280",
            "GestureDetector props",
            {
              isTopCard,
              panGestureRaw: panGesture,
              panGestureType: typeof panGesture,
              panGestureIsNull: panGesture === null,
              gestureToPass,
              gestureToPassType: typeof gestureToPass,
              gestureToPassExists: !!gestureToPass,
              gestureToPassIsNull: gestureToPass === null,
              GestureDetectorExists: typeof GestureDetector !== "undefined",
            },
            "C"
          );
          // #endregion

          const cardContent = (
            <Animated.View
              style={styles.cardWrapper}
              pointerEvents="box-none" // Allow touches to pass through to children, but still detect gestures
            >
              {(() => {
                try {
                  return renderCard(item, currentIndex + index);
                } catch (error) {
                  log(
                    "SwipeDeck.tsx:renderCard",
                    "Error rendering card",
                    {
                      error:
                        error instanceof Error ? error.message : String(error),
                      errorStack:
                        error instanceof Error ? error.stack : undefined,
                      itemId: getItemId(item),
                      index,
                    },
                    "F"
                  );
                  return (
                    <View style={{ padding: 20 }}>
                      <Text>Error rendering card</Text>
                    </View>
                  );
                }
              })()}
              {isTopCard && <SwipeOverlay translateX={translateX} />}
            </Animated.View>
          );

          // Don't use a separate tap gesture - handle taps in pan gesture's onEnd
          // This prevents gesture conflicts
          const combinedGesture = gestureToPass;

          // #region agent log
          console.log("[DEBUG C] Final gesture setup", {
            isTopCard,
            hasPanGesture: !!panGesture,
            hasGestureToPass: !!gestureToPass,
            hasCombinedGesture: !!combinedGesture,
            willUseGestureDetector: !!combinedGesture,
            onCardTapExists: !!onCardTap,
          });
          log(
            "SwipeDeck.tsx:render",
            "Final gesture setup",
            {
              isTopCard,
              hasPanGesture: !!panGesture,
              hasGestureToPass: !!gestureToPass,
              hasCombinedGesture: !!combinedGesture,
              willUseGestureDetector: !!combinedGesture,
              onCardTapExists: !!onCardTap,
            },
            "C"
          );
          // #endregion

          const itemId = getItemId(item);
          return (
            <Animated.View
              key={`${itemId}-${currentIndex + index}`}
              style={[
                getCardStyle(index),
                isTopCard && animatedStyle,
                cardStyle,
              ]}
              pointerEvents={isTopCard ? "auto" : "none"} // Only top card should receive touches
            >
              {combinedGesture ? (
                <GestureDetector
                  key={`gesture-${itemId}-${currentIndex}`}
                  gesture={combinedGesture}
                >
                  {cardContent}
                </GestureDetector>
              ) : (
                cardContent
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
    const overlayOpacity =
      translateX.value < 0
        ? Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1) * 0.8
        : 0;
    return {
      opacity: overlayOpacity,
    };
  });

  const rightOverlayStyle = useAnimatedStyle(() => {
    const overlayOpacity =
      translateX.value > 0
        ? Math.min(translateX.value / SWIPE_THRESHOLD, 1) * 0.8
        : 0;
    return {
      opacity: overlayOpacity,
    };
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
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  deckContainer: {
    width: CARD_WIDTH,
    height: 500,
    position: "relative",
  },
  cardWrapper: {
    width: "100%",
    height: "100%",
    // Ensure the wrapper can receive touch events
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
  overlayText: {
    fontSize: 80,
    fontWeight: "bold",
    color: "#ffffff",
  },
});
