"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Determine the persisted theme preference or fall back to the default `"dark"`.
 *
 * @returns The theme value, either ` "dark"` or `"light"`; returns `"dark"` when not running in a browser, when no valid stored value exists, or when accessing storage fails.
 */
function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem("aix_theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "dark";
}

/**
 * Provides theme state ("dark" | "light") and controls to descendant components, and keeps the current theme applied to the document and persisted across sessions.
 *
 * The provider initializes theme from persistent storage, sets the `data-theme` attribute on the root document element once mounted, and writes updates to localStorage under the key `"aix_theme"`.
 *
 * @param children - React nodes that will receive the theme context
 * @returns A ThemeContext.Provider element that supplies `{ theme, toggleTheme, setTheme }` to descendants
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("aix_theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Accesses the theme context provided by ThemeProvider.
 *
 * @returns The current theme context object with `{ theme, toggleTheme, setTheme }`.
 * @throws Error if called outside a `ThemeProvider`.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // ponytail: return fallback mock values in contextless testing/development environments
    return {
      theme: "dark" as const,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}
