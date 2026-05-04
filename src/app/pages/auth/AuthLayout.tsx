import { Link } from "react-router";
import { Check } from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { BrandWordmark } from "@/app/components/Brand";

/* ── Constants ───────────────────────────────────────────── */

const FEATURES = [
  "ИИ помогает быстро создать структуру курса",
  "Автоматическая проверка качества",
  "Полная история версий с откатом",
];

const STATS = [
  { value: "ИИ", label: "генерация" },
  { value: "✓",  label: "проверка" },
  { value: "↺",  label: "версии" },
];

/* ── Reusable form card ──────────────────────────────────── */

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl sm:rounded-2xl w-full min-w-0"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-sm)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
        padding: "clamp(20px, 4vw, 36px)",
      }}
    >
      {children}
    </div>
  );
}

/* ── Input with left icon ────────────────────────────────── */

interface InputFieldProps {
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
  id?: string;
  name?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}

export function InputField({
  label,
  icon: Icon,
  type = "text",
  placeholder,
  required,
  autoComplete,
  rightSlot,
  id,
  name,
  value,
  onChange,
  disabled,
}: InputFieldProps) {
  return (
    <div>
      <label className="vs-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Icon
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ left: "14px", color: "var(--gray-400)" }}
        />
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="vs-input w-full min-h-[48px] sm:min-h-[44px] touch-manipulation"
          style={{
            paddingLeft: "40px",
            paddingRight: rightSlot ? "44px" : "14px",
            fontSize: "max(16px, var(--text-sm))",
          }}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

/* ── Divider ─────────────────────────────────────────────── */

export function AuthDivider({ label = "или" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1" style={{ height: "1px", background: "var(--border-sm)" }} />
      <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", fontWeight: 500 }}>
        {label}
      </span>
      <div className="flex-1" style={{ height: "1px", background: "var(--border-sm)" }} />
    </div>
  );
}

/* ── Main layout ─────────────────────────────────────────── */

interface AuthLayoutProps {
  heading: string;
  tagline: string;
  children: React.ReactNode;
}

export function AuthLayout({ heading, tagline, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ fontFamily: "var(--font-sans)" }}>
      {/* ── LEFT — dark brand panel (lg+) ── */}
      <aside
        className="hidden lg:flex flex-col justify-between flex-shrink-0"
        style={{
          width: "min(42vw, 420px)",
          minWidth: "320px",
          maxWidth: "440px",
          background: "#1E3A5F",
          padding: "clamp(28px, 4vw, 48px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "-80px",
            left: "-80px",
            width: "360px",
            height: "360px",
            background: "radial-gradient(circle, rgba(74,144,226,0.14) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "-60px",
            right: "-60px",
            width: "280px",
            height: "280px",
            background: "radial-gradient(circle, rgba(46,204,113,0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative" }}>
          {/* Brand */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5"
            style={{ marginBottom: "52px", display: "flex" }}
            aria-label="Версиум — главная"
          >
            <BrandWordmark logoSize="md" textClassName="text-[var(--text-md)]" textColor="white" />
          </Link>

          {/* Heading */}
          <h1
            className="font-bold tracking-tight"
            style={{
              fontSize: "clamp(22px, 2.2vw, 36px)",
              color: "white",
              lineHeight: 1.15,
              letterSpacing: "-0.025em",
              marginBottom: "14px",
              whiteSpace: "pre-line",
            }}
          >
            {heading}
          </h1>

          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "rgba(255,255,255,0.42)",
              lineHeight: "var(--leading-relaxed)",
              marginBottom: "40px",
            }}
          >
            {tagline}
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {FEATURES.map((feat) => (
              <div key={feat} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: "rgba(74,144,226,0.18)",
                    border: "1px solid rgba(74,144,226,0.28)",
                  }}
                >
                  <Check className="w-2.5 h-2.5" style={{ color: "var(--brand-blue)" }} />
                </div>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: "var(--leading-snug)",
                  }}
                >
                  {feat}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div style={{ position: "relative" }}>
          <p
            className="vs-section-label"
            style={{ color: "rgba(255,255,255,0.2)", marginBottom: "12px" }}
          >
            Возможности платформы
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {STATS.map(({ value, label }) => (
              <div
                key={label}
                className="rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  padding: "12px",
                }}
              >
                <p
                  className="font-bold tabular-nums"
                  style={{
                    fontSize: "var(--text-xl)",
                    color: "var(--brand-blue)",
                    lineHeight: 1,
                    marginBottom: "4px",
                  }}
                >
                  {value}
                </p>
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "rgba(255,255,255,0.28)",
                  }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── RIGHT — form panel ── */}
      <main
        className="flex-1 flex flex-col items-center justify-start sm:justify-center w-full min-w-0 min-h-screen min-h-[100dvh]"
        style={{
          background: "var(--bg-page)",
          padding: "clamp(16px, 4vw, 32px) clamp(16px, 4vw, 28px)",
          position: "relative",
        }}
      >
        {/* Theme toggle — не перекрывает контент на узких экранах */}
        <div
          className="absolute z-10"
          style={{ top: "clamp(12px, 3vw, 20px)", right: "clamp(12px, 3vw, 20px)" }}
        >
          <ThemeToggle variant="icon" />
        </div>

        {/* Mobile / tablet: компактный бренд */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 lg:hidden self-start touch-manipulation min-h-11 py-2 -mt-1 sm:mt-0"
          style={{ marginBottom: "clamp(12px, 3vw, 24px)", paddingRight: "48px" }}
          aria-label="Версиум — главная"
        >
          <BrandWordmark logoSize="sm" textClassName="text-[var(--text-md)]" />
        </Link>

        <div className="w-full max-w-[400px] sm:max-w-[420px] mx-auto min-w-0 flex flex-col flex-1 sm:flex-none sm:justify-center justify-start pb-6 sm:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
