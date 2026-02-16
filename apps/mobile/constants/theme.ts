import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Platform } from "react-native";

const Palette = {
  maroon: {
    900: "#3e1a26",
    700: "#58002b",
    500: "#7A003C", // Brand Primary
    300: "#E8C4D0",
    50: "#FFF0F5",
  },
  grey: {
    900: "#11181C", // High contrast text
    800: "#232628", // Dark surface
    700: "#3E4347", // Dark border
    500: "#687076", // Secondary text / Icons
    400: "#9BA1A6",
    300: "#D1D5DB",
    200: "#E5E7EB", // Light border
    100: "#F3F4F6", // Divider
    50: "#F9FAFB", // Secondary surface
    0: "#FFFFFF",
  },
  // Semantic Colors
  red: {
    main: "#EF4444",
    light: "#F87171",
    bg: "#FEF2F2",
    darkBg: "#450a0a",
  },
  green: {
    main: "#065F46",
    light: "#34D399",
    bg: "#ECFDF5",
    darkBg: "#064e3b",
  },
  orange: {
    main: "#F59E0B", // Warning / Pending
    dark: "#92400E",
    bg: "#FFFBEB",
    darkBg: "#451a03",
  },
  blue: {
    main: "#006FEE", // Info / Processing
    light: "#60A5FA",
    bg: "#EFF6FF",
    darkBg: "#172554",
  },
  purple: {
    main: "#7E22CE", // Often used for "Active" states distinct from primary
    bg: "#FAF5FF",
  },
};

export const Colors = {
  light: {
    // --- Brand ---
    primary: Palette.maroon[500],
    primaryActive: Palette.maroon[700],
    primaryLight: Palette.maroon[50],
    tint: Palette.maroon[500],

    // --- Backgrounds ---
    background: "#F5F7FA", // App background
    surface: Palette.grey[0], // Cards/Modals
    surfaceSecondary: Palette.grey[50], // Grouped lists
    inputBackground: Palette.grey[0],

    // --- Text ---
    text: Palette.grey[900],
    textSecondary: Palette.grey[500],
    textTertiary: Palette.grey[400],
    placeholder: Palette.grey[400],

    // --- Borders ---
    border: Palette.grey[200],
    borderFocus: Palette.maroon[500],
    divider: Palette.grey[100],

    // --- Statuses (Added Pending/Processing) ---
    success: Palette.green.main,
    successBackground: Palette.green.bg,

    error: Palette.red.main,
    errorBackground: Palette.red.bg,

    warning: Palette.orange.dark, // Severe warnings
    warningBackground: Palette.orange.bg,

    pending: Palette.orange.main,
    pendingBackground: Palette.orange.bg,

    processing: Palette.blue.main,
    processingBackground: Palette.blue.bg,

    info: Palette.blue.main,
    infoBackground: Palette.blue.bg,

    // --- Interaction ---
    disabled: Palette.grey[200],
    disabledText: Palette.grey[400],
    icon: Palette.grey[500],
    overlay: "rgba(0, 0, 0, 0.5)",
    shadow: "#000000",

    // --- Navigation ---
    tabIconDefault: Palette.grey[500],
    tabIconSelected: Palette.maroon[500],
  },
  dark: {
    // --- Brand ---
    primary: Palette.maroon[300],
    primaryActive: Palette.maroon[500],
    primaryLight: Palette.maroon[900],
    tint: Palette.grey[0],

    // --- Backgrounds ---
    background: "#151718",
    surface: Palette.grey[800],
    surfaceSecondary: "#2C3033",
    inputBackground: "#1A1D1E",

    // --- Text ---
    text: "#ECEDEE",
    textSecondary: Palette.grey[400],
    textTertiary: Palette.grey[500],
    placeholder: Palette.grey[500],

    // --- Borders ---
    border: Palette.grey[700],
    borderFocus: Palette.maroon[300],
    divider: "#2A2E31",

    // --- Statuses ---
    success: Palette.green.light,
    successBackground: Palette.green.darkBg,

    error: Palette.red.light,
    errorBackground: Palette.red.darkBg,

    warning: Palette.orange.main,
    warningBackground: Palette.orange.darkBg,

    pending: Palette.orange.main,
    pendingBackground: Palette.orange.darkBg,

    processing: Palette.blue.light,
    processingBackground: Palette.blue.darkBg,

    info: Palette.blue.light,
    infoBackground: Palette.blue.darkBg,

    // --- Interaction ---
    disabled: "#374151",
    disabledText: Palette.grey[500],
    icon: Palette.grey[400],
    overlay: "rgba(0, 0, 0, 0.7)",
    shadow: "#000000",

    // --- Navigation ---
    tabIconDefault: Palette.grey[400],
    tabIconSelected: Palette.grey[0],
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

export type AppColors = typeof Colors.light;
export type AppFonts = typeof Fonts;

export interface AppTheme {
  colors: AppColors;
  fonts: AppFonts;
  isDark: boolean;
}
