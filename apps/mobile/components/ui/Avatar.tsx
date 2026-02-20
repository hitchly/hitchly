import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 64 }: AvatarProps) {
  const { colors } = useTheme();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: colors.text,
          borderRadius: size / 4,
        },
      ]}
    >
      <Text
        weight="700"
        style={{ fontSize: size * 0.4 }}
        color={colors.background}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
