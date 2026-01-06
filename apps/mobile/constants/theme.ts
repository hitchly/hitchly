import { Platform } from "react-native";

// McMaster Brand Colors
const maroon = "#7A003C";
const maroonLight = "#FFF0F5"; // Used for active backgrounds
const greyBackground = "#F5F7FA";

export const Colors = {
  light: {
    // Base
    text: "#11181C",
    textSecondary: "#687076",
    background: greyBackground,
    surface: "#ffffff", // Card background

    // Brand
    tint: maroon,
    primary: maroon,
    primaryLight: maroonLight,

    // Borders
    border: "#eeeeee",

    // Semantic
    error: "#EF4444",
    errorBackground: "#FEF2F2",
    success: "#065F46",
    successBackground: "#ECFDF5",
    warning: "#92400E",
    warningBackground: "#FFFBEB",

    // UI Elements
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: maroon,
  },
  dark: {
    // Dark mode placeholder (mapped to sensible defaults)
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    background: "#151718",
    surface: "#232628",

    tint: "#fff",
    primary: "#E8C4D0", // Lighter maroon for dark mode
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

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "sans-serif",
    serif: "serif",
    rounded: "sans-serif", // Android doesn't have a default rounded font
    mono: "monospace",
  },
});
