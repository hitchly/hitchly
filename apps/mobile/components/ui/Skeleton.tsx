import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

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
      {text ? (
        <Text
          style={[
            styles.text,
            { color: colors.textSecondary, fontFamily: fonts.mono },
          ]}
        >
          {text.toUpperCase()}
        </Text>
      ) : null}
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
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
