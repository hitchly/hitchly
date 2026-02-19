import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
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
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsVisible(false);
        }
      });
    }
  }, [isSwitching, fadeAnim]);

  if (!isVisible) return null;

  const nextRole = role === AppRole.RIDER ? "Rider" : "Driver";
  const roleIcon = role === AppRole.RIDER ? "person-outline" : "car-outline";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        { backgroundColor: colors.background, opacity: fadeAnim },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: `${colors.primary}15` },
          ]}
        >
          <Ionicons name={roleIcon} size={32} color={colors.primary} />
        </View>

        <Text variant="h3" align="center">
          Switching to {nextRole} Mode
        </Text>

        <Text variant="caption" color={colors.textSecondary}>
          Optimizing your experience...
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
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
});
