import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface ActiveTripBannerProps {
  tripId: string;
  roleLabel: string;
}

export const ActiveTripBanner = ({
  tripId,
  roleLabel,
}: ActiveTripBannerProps) => {
  const router = useRouter();
  const segments = useSegments(); // Use segments instead of pathname
  const { colors, isDark } = useTheme();
  const { bottom } = useSafeAreaInsets();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const isModalActive = segments.join("/").includes("(modals)");

  if (isModalActive) return null;

  const handlePress = () => {
    const action = roleLabel === "DRIVING" ? "drive" : "ride";
    router.push(`/(app)/(modals)/${action}?tripId=${tripId}` as Href);
  };

  return (
    <View style={[styles.wrapper, { bottom: bottom + 90 }]}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            shadowOpacity: isDark ? 0.4 : 0.08,
            shadowRadius: isDark ? 10 : 12,
            elevation: isDark ? 8 : 4,
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.left}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            </Animated.View>

            <View>
              <Text variant="captionSemibold" style={{ color: colors.text }}>
                {roleLabel} IN PROGRESS
              </Text>
              <Text variant="caption" style={{ color: colors.textSecondary }}>
                Tap to expand live portal
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Ionicons name="expand" size={12} color={colors.textSecondary} />
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 99999,
  },
  pill: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
});
