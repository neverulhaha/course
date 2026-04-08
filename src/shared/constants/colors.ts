/**
 * ВЕРСИУМ — Centralized Color Palette
 *
 * ONLY these values may be used across the entire application.
 * Never use Tailwind's default color utilities (blue-500, gray-100, etc.)
 * or any hex/rgba value not derived from this palette.
 */

/* ── Primary accent ─────────────────────────────────────── */
export const BLUE        = "#4A90E2";
export const BLUE_DARK   = "#1E3A5F";

/* ── Base ────────────────────────────────────────────────── */
export const WHITE       = "#FFFFFF";
export const BLACK       = "#000000";

/* ── Neutrals ────────────────────────────────────────────── */
export const GRAY_DARK   = "#333333";   // primary text, headings
export const GRAY_MID    = "#666666";   // secondary text, labels
export const GRAY_LIGHT  = "#C0C0C0";   // muted text, borders, icons

/* ── Semantic ────────────────────────────────────────────── */
export const SUCCESS     = "#2ECC71";   // green — completed, passed, positive
export const WARNING     = "#F1C40F";   // yellow — warning, caution, medium severity
export const DANGER      = "#E74C3C";   // red — error, critical, destructive
export const PURPLE      = "#9B59B6";   // purple — structure, code, special
export const PINK        = "#F5A7B8";   // soft pink — decorative accent
export const NAVY        = "#1E3A5F";   // alias for BLUE_DARK (deep navy)

/* ── Derived rgba helpers ────────────────────────────────── */
export const rgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Usage guide:
 *
 * import { BLUE, SUCCESS, DANGER, rgba } from "@/shared/constants/colors";
 *
 * Primary buttons:     background: BLUE
 * Hover/dark buttons:  background: BLUE_DARK
 * Main text:           color: GRAY_DARK
 * Secondary text:      color: GRAY_MID
 * Muted/disabled:      color: GRAY_LIGHT
 * Borders:             borderColor: GRAY_LIGHT
 * Success states:      color: SUCCESS, background: rgba(SUCCESS, 0.08)
 * Error states:        color: DANGER,  background: rgba(DANGER, 0.06)
 * Warning states:      color: WARNING, background: rgba(WARNING, 0.08)
 * Code blocks bg:      background: BLACK, color: WHITE
 */

export const COLORS = {
  blue:      BLUE,
  blueDark:  BLUE_DARK,
  white:     WHITE,
  black:     BLACK,
  grayDark:  GRAY_DARK,
  grayMid:   GRAY_MID,
  grayLight: GRAY_LIGHT,
  success:   SUCCESS,
  warning:   WARNING,
  danger:    DANGER,
  purple:    PURPLE,
  pink:      PINK,
  navy:      NAVY,
} as const;

export type ColorKey = keyof typeof COLORS;
