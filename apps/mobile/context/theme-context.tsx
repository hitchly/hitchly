import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

import { Colors, Fonts } from "../constants/theme";

interface Theme {
  colors: typeof Colors.light;
  fonts: typeof Fonts;
  isDark: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const theme: Theme = {
    colors: isDark ? Colors.dark : Colors.light,
    fonts: Fonts,
    isDark,
  };

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within an AppThemeProvider");
  }

  return context;
};
