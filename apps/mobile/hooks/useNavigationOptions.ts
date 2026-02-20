import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();

  // Define the base dimensions for the tab bar content itself
  const BASE_HEIGHT = 60;
  const BASE_PADDING_BOTTOM = 8;

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
      height: BASE_HEIGHT + insets.bottom,
      paddingBottom: BASE_PADDING_BOTTOM + insets.bottom,
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
