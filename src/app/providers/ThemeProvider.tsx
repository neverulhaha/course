import { createContext, useContext, useEffect, useState } from "react";

/* ─── Types ───────────────────────────────────────────────── */

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

/* ─── Context ─────────────────────────────────────────────── */

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

/* ─── Provider ────────────────────────────────────────────── */

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("vs-theme") as Theme | null;
    if (stored === "light" || stored === "dark") return stored;
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  } catch (_) {}
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("vs-theme", theme); } catch (_) {}
  }, [theme]);

  const toggleTheme = () => setThemeState((t) => (t === "light" ? "dark" : "light"));
  const setTheme    = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────────────── */

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
