import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Platform } from "react-native";

const maroon = "#7A003C";
const maroonLight = "#FFF0F5";
const greyBackground = "#F5F7FA";

export const Colors = {
  light: {
    text: "#11181C",
    textSecondary: "#687076",
    background: greyBackground,
    surface: "#ffffff",
    tint: maroon,
    primary: maroon,
    primaryLight: maroonLight,
    border: "#eeeeee",
    error: "#EF4444",
    errorBackground: "#FEF2F2",
    success: "#065F46",
    successBackground: "#ECFDF5",
    warning: "#92400E",
    warningBackground: "#FFFBEB",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: maroon,
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    background: "#151718",
    surface: "#232628",
    tint: "#fff",
    primary: "#E8C4D0",
    primaryLight: "#3e1a26",
    border: "#3E4347",
    error: "#F87171",
    errorBackground: "#450a0a",
    success: "#34D399",
    successBackground: "#064e3b",
    warning: "#FBBF24",
    warningBackground: "#451a03",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#fff",
  },
};

export const Fonts = {
  regular: Platform.select({ ios: "System", android: "sans-serif" }),
  bold: Platform.select({ ios: "System", android: "sans-serif-medium" }),
  mono: Platform.select({ ios: "Courier", android: "monospace" }),
};

export const NavTheme = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.primary,
      background: Colors.light.background,
      card: Colors.light.surface,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.error,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.primary,
      background: Colors.dark.background,
      card: Colors.dark.surface,
      text: Colors.dark.text,
      border: Colors.dark.border,
      notification: Colors.dark.error,
    },
  },
};
