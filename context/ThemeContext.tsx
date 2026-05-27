import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Colors } from "../constants/theme";

type ThemeMode = "light" | "dark";

type ThemeContextType = {
  mode: ThemeMode;
  colors: typeof Colors.light;
  toggleTheme: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  colors: Colors.light,
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  // Load saved theme when app opens
  useEffect(() => {
    AsyncStorage.getItem("readnest-theme").then((saved) => {
      if (saved === "dark" || saved === "light") {
        setMode(saved);
      }
    });
  }, []);

  function toggleTheme() {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    AsyncStorage.setItem("readnest-theme", next);
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colors: Colors[mode],
        toggleTheme,
        isDark: mode === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// This is what you call inside any screen to get colors
export function useTheme() {
  return useContext(ThemeContext);
}
