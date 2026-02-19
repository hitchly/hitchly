import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { AppRole } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";
import { useTheme } from "@/context/theme-context";

export function RoleTransitionOverlay() {
  const { isSwitching, role } = useUserRole();
  const { colors } = useTheme();

  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSwitching) {
      setIsVisible(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsVisible(false);
        }
      });
    }
  }, [isSwitching, fadeAnim]);

  if (!isVisible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        { backgroundColor: colors.background, opacity: fadeAnim },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.text }]}>
          Switching to {role === AppRole.RIDER ? "Rider" : "Driver"} Mode...
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 12,
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
  },
});
