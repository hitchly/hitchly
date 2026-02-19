import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/Text";
import { useTheme } from "@/context/theme-context";

interface SkeletonProps {
  text?: string;
  fullScreen?: boolean;
}

export function Skeleton({
  text = "LOADING...",
  fullScreen = true,
}: SkeletonProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { backgroundColor: colors.background },
      ]}
    >
      <ActivityIndicator size="small" color={colors.text} />

      {text && (
        <Text variant="mono" color={colors.textSecondary} style={styles.text}>
          {text.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  fullScreen: {
    flex: 1,
  },
  text: {
    letterSpacing: 2,
    fontSize: 10,
  },
});
