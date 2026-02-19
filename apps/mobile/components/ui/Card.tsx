import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/context/theme-context";

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "flat";
  onPress?: () => void;
}

export function Card({
  children,
  style,
  variant = "default",
  onPress,
}: CardProps) {
  const { colors } = useTheme();

  const cardContent = (isPressed = false) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isPressed ? colors.surfaceSecondary : colors.surface,
          borderColor: colors.border,
        },
        variant === "default" && styles.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressedState]}
      >
        {({ pressed }) => cardContent(pressed)}
      </Pressable>
    );
  }

  return cardContent();
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pressedState: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
