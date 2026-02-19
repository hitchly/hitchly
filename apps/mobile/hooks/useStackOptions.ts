import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { Fonts, FontSizes } from "@/constants/theme";
import { useTheme } from "@/context/theme-context";

export function useStackOptions(): NativeStackNavigationOptions {
  const { colors } = useTheme();

  return {
    headerStyle: {
      backgroundColor: colors.background,
    },
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
