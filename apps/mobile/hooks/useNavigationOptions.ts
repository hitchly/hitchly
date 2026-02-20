import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Platform, StyleSheet } from "react-native";

import { Fonts, FontSizes } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";

export function useStackOptions(): NativeStackNavigationOptions {
  const { colors } = useTheme();

  return {
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: false,
    headerTintColor: colors.text,
    headerTitleStyle: {
      fontFamily: Fonts.semibold,
      fontSize: FontSizes.h4,
      color: colors.text,
    },
    headerBackVisible: true,
  };
}

export function useTabsOptions(): BottomTabNavigationOptions {
  const { colors } = useTheme();

  return {
    headerShown: false,
    tabBarActiveTintColor: colors.text,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarStyle: {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      elevation: 0,
      shadowOpacity: 0,
      height: Platform.OS === "ios" ? 88 : 68,
      paddingBottom: Platform.OS === "ios" ? 28 : 12,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontFamily: Fonts.semibold,
      fontSize: 10,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginTop: 4,
    },
  };
}
