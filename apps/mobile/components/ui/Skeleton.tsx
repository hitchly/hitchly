import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface SkeletonProps {
  text?: string;
  fullScreen?: boolean;
}

export function Skeleton({
  text = "Loading...",
  fullScreen = true,
}: SkeletonProps) {
  const { colors, fonts } = useTheme();

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { backgroundColor: colors.background },
      ]}
    >
      <ActivityIndicator size="large" color={colors.primary} />

      {text && (
        <Text
          variant="caption"
          style={[
            styles.text,
            {
              color: colors.textSecondary,
              fontFamily: fonts.mono,
              textTransform: "uppercase",
            },
          ]}
        >
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fullScreen: {
    flex: 1,
  },
  text: {
    marginTop: 16,
    letterSpacing: 1.5,
    fontWeight: "600",
  },
});
