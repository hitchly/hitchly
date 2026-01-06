import React, { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { Colors } from "../constants/theme"; // Adjust path to your theme file

// Automatically infer the type of your theme object
type Theme = typeof Colors.light;

// Create the context with default light values
const ThemeContext = createContext<Theme>(Colors.light);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();

  // Select the correct theme object based on system setting
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

// Custom Hook to use in your components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within an AppThemeProvider");
  }
  return context;
};
