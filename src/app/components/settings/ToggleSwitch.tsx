const FONT = "'Montserrat', sans-serif";

export interface ToggleSwitchProps {
  pressed: boolean;
  onPressedChange: (value: boolean) => void;
  "aria-label": string;
  disabled?: boolean;
}

/** Theme-aware toggle matching profile / SaaS patterns */
export function ToggleSwitch({
  pressed,
  onPressedChange,
  "aria-label": ariaLabel,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onPressedChange(!pressed)}
      className="relative h-[21px] w-[38px] shrink-0 touch-manipulation rounded-[11px] border-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        fontFamily: FONT,
        background: pressed ? "var(--brand-blue)" : "var(--gray-200)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-[var(--bg-surface)] shadow-sm transition-[left]"
        style={{
          width: 17,
          height: 17,
          left: pressed ? 19 : 2,
        }}
      />
    </button>
  );
}
