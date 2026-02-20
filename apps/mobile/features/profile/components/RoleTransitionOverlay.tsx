import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { IconBox } from "@/components/ui/IconBox";
import { Text } from "@/components/ui/Text";
import { AppRole } from "@/constants/roles";
import { useUserRole } from "@/context/role-context";
import { useTheme } from "@/context/theme-context";

export function RoleTransitionOverlay() {
  const { isSwitching, role } = useUserRole();
  const { colors } = useTheme();

  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (isSwitching) {
      setIsVisible(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsVisible(false);
          scaleAnim.setValue(0.95);
        }
      });
    }
  }, [isSwitching, fadeAnim, scaleAnim]);

  if (!isVisible) return null;

  const nextRole = role === AppRole.RIDER ? "Rider" : "Driver";
  const roleIcon =
    role === AppRole.RIDER ? "person-outline" : "car-sport-outline";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        { backgroundColor: colors.background, opacity: fadeAnim },
      ]}
    >
      <Animated.View
        style={[styles.content, { transform: [{ scale: scaleAnim }] }]}
      >
        <IconBox
          name={roleIcon}
          variant="contrast"
          size={32}
          style={styles.iconBoxOverride}
        />

        <Text variant="h3" align="center" style={styles.title}>
          Switching to {nextRole} Mode
        </Text>

        <Text
          variant="mono"
          color={colors.textSecondary}
          style={styles.monoText}
        >
          OPTIMIZING EXPERIENCE...
        </Text>
      </Animated.View>
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
    paddingHorizontal: 40,
  },
  iconBoxOverride: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    marginBottom: 8,
  },
  monoText: {
    letterSpacing: 2,
    fontSize: 10,
  },
});
