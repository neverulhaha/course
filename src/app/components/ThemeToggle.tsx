import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/providers/ThemeProvider";

const FONT = "'Montserrat', sans-serif";

/* ─── Sidebar / inline variant ────────────────────────────── */

interface ThemeToggleProps {
  /** "row" = full-width sidebar button  "icon" = compact icon-only button */
  variant?: "row" | "icon";
}

export function ThemeToggle({ variant = "row" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        title={isDark ? "Светлая тема" : "Тёмная тема"}
        style={{
          width: 32, height: 32, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "none", border: "1px solid var(--border-sm)",
          cursor: "pointer", color: "var(--gray-600)",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--gray-100)";
          e.currentTarget.style.borderColor = "var(--border-md)";
          e.currentTarget.style.color = "var(--gray-900)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.borderColor = "var(--border-sm)";
          e.currentTarget.style.color = "var(--gray-600)";
        }}
      >
        {isDark ? <Sun style={{ width: 15, height: 15 }} /> : <Moon style={{ width: 15, height: 15 }} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", padding: "7px 10px", borderRadius: 9,
        background: "none", border: "none", cursor: "pointer",
        fontFamily: FONT, fontWeight: 600, fontSize: "12.5px",
        color: "var(--gray-600)", textAlign: "left",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--gray-100)";
        e.currentTarget.style.color = "var(--gray-800)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "none";
        e.currentTarget.style.color = "var(--gray-600)";
      }}
    >
      {isDark
        ? <Sun  style={{ width: 15, height: 15, flexShrink: 0 }} />
        : <Moon style={{ width: 15, height: 15, flexShrink: 0 }} />
      }
      {isDark ? "Светлая тема" : "Тёмная тема"}
    </button>
  );
}
