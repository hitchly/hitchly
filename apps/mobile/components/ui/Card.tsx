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
  variant?: "default" | "flat" | "outline";
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
        variant === "default" && styles.border,
        variant === "outline" && styles.outlineShadow,
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
        style={({ pressed }) => [
          styles.pressableBase,
          pressed && styles.pressedState,
        ]}
      >
        {({ pressed }) => cardContent(pressed)}
      </Pressable>
    );
  }

  return cardContent();
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 16,
  },
  border: {
    borderWidth: 1,
  },
  outlineShadow: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  pressableBase: {
    borderRadius: 8,
  },
  pressedState: {
    transform: [{ scale: 0.985 }],
  },
});
