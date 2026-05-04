import { Link } from "react-router";
import {
  ArrowRight,
  Sparkles,
  Shield,
  History,
  BookOpen,
  Check,
  Zap,
  Layers,
  RefreshCw,
  FileText,
  ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { BrandWordmark } from "@/app/components/Brand";
import { useAuth } from "@/hooks/useAuth";

/* ─── Layout tokens (responsive shell) ─────────────────────── */

const SHELL = "w-full max-w-[1100px] xl:max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8";
const SECTION_Y = "py-12 sm:py-16 lg:py-24";

/* ─── Tiny helpers ─────────────────────────────────────────── */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold"
      style={{
        fontSize: "var(--text-xs)",
        background: "rgba(74,144,226,0.08)",
        color: "var(--brand-blue)",
        border: "1px solid rgba(74,144,226,0.18)",
      }}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="vs-section-label mb-4"
      style={{ color: "var(--brand-blue)", letterSpacing: "0.14em" }}
    >
      {children}
    </p>
  );
}

/* ─── Product illustration (skeleton only, no sample metrics) ─ */

function EditorShellIllustration() {
  const treeRows = [
    { status: "#2ECC71", active: false },
    { status: "#4A90E2", active: true },
    { status: "#F1C40F", active: false },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden select-none"
      style={{
        background: "#000000",
        boxShadow: "0 40px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center gap-2 px-4"
        style={{ height: "38px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="w-3 h-3 rounded-full" style={{ background: "#E74C3C" }} />
        <div className="w-3 h-3 rounded-full" style={{ background: "#F1C40F" }} />
        <div className="w-3 h-3 rounded-full" style={{ background: "#2ECC71" }} />
        <div
          className="ml-4 flex-1 rounded"
          style={{ height: "20px", background: "rgba(255,255,255,0.06)", maxWidth: "220px" }}
        />
      </div>

      {/* Editor body */}
      <div className="flex" style={{ height: "320px" }}>
        {/* Left: module tree */}
        <div
          className="flex flex-col flex-shrink-0"
          style={{ width: "200px", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "14px 0" }}
        >
          <div className="px-4 mb-3">
            <div className="rounded h-2 mb-1.5" style={{ width: "60%", background: "rgba(255,255,255,0.12)" }} />
            <div className="rounded h-1.5" style={{ width: "40%", background: "rgba(255,255,255,0.06)" }} />
          </div>
          {treeRows.map((l, i) => (
            <div
              key={i}
              className="px-4 py-2.5 relative"
              style={{
                background: l.active ? "rgba(74,144,226,0.1)" : "transparent",
                borderLeft: l.active ? "2px solid #4A90E2" : "2px solid transparent",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: l.status }} />
                <div className="rounded h-1.5 flex-1" style={{ background: "rgba(255,255,255,0.18)" }} />
              </div>
              <div
                className="rounded"
                style={{
                  height: "6px",
                  width: "80%",
                  background: l.active ? "rgba(74,144,226,0.4)" : "rgba(255,255,255,0.08)",
                }}
              />
            </div>
          ))}
        </div>

        {/* Center: content canvas */}
        <div
          className="flex-1 overflow-hidden"
          style={{ padding: "20px 24px" }}
        >
          {/* Heading bar */}
          <div className="rounded h-5 mb-3" style={{ width: "70%", background: "rgba(255,255,255,0.18)" }} />
          {/* Subtitle */}
          <div className="rounded h-2.5 mb-6" style={{ width: "40%", background: "rgba(255,255,255,0.08)" }} />

          {/* Content blocks */}
          {[
            { label: "ЦЕЛЬ УРОКА", w: "100%", lines: 2, accent: "#4A90E2" },
            { label: "ТЕОРИЯ",     w: "100%", lines: 3, accent: "#4A90E2" },
            { label: "КОД",        w: "100%", lines: 2, accent: "#2ECC71", code: true },
          ].map((b) => (
            <div
              key={b.label}
              className="mb-3 rounded-lg overflow-hidden"
              style={{
                border: "1px solid rgba(255,255,255,0.07)",
                borderLeft: `2px solid ${b.accent}`,
              }}
            >
              <div
                className="px-3 py-1.5 flex items-center gap-2"
                style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  className="rounded"
                  style={{ width: "48px", height: "6px", background: "rgba(255,255,255,0.15)" }}
                />
                <div
                  className="rounded ml-auto"
                  style={{ width: "24px", height: "6px", background: `${b.accent}40` }}
                />
              </div>
              <div
                className="px-3 py-2.5"
                style={{ background: b.code ? "rgba(0,0,0,0.3)" : "transparent" }}
              >
                {Array.from({ length: b.lines }).map((_, li) => (
                  <div
                    key={li}
                    className="rounded mb-1.5"
                    style={{
                      height: "7px",
                      width: li === b.lines - 1 ? "60%" : "100%",
                      background: b.code
                        ? li === 0 ? "#2ECC7140" : "#4A90E230"
                        : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: intelligence rail */}
        <div
          className="flex-shrink-0 flex flex-col"
          style={{ width: "148px", borderLeft: "1px solid rgba(255,255,255,0.06)", padding: "14px 12px" }}
        >
          <div className="rounded h-1.5 mb-4" style={{ width: "70%", background: "rgba(255,255,255,0.1)" }} />

          {/* QA pill */}
          <div
            className="rounded-lg px-2.5 py-2 mb-3"
            style={{ background: "rgba(241,196,15,0.1)", border: "1px solid rgba(241,196,15,0.2)" }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="rounded h-1.5" style={{ width: "50%", background: "rgba(241,196,15,0.35)" }} />
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#F1C40F" }}>1</span>
            </div>
            <div className="rounded h-1.5" style={{ width: "80%", background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* AI actions */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 py-2 rounded-lg px-1.5 mb-0.5"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ background: "rgba(74,144,226,0.4)" }} />
              <div className="rounded h-1.5 flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
          ))}

          {/* Score circle */}
          <div className="mt-auto flex items-center justify-center">
            <div
              className="flex flex-col items-center justify-center rounded-xl"
              style={{
                width: "56px",
                height: "56px",
                background: "rgba(74,144,226,0.1)",
                border: "1px solid rgba(74,144,226,0.2)",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.35)", lineHeight: 1 }}>—</span>
              <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>QA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Упрощённая иллюстрация редактора для узких экранов — без горизонтального скролла */
function EditorShellIllustrationCompact() {
  return (
    <div
      className="rounded-2xl overflow-hidden select-none w-full max-w-md mx-auto"
      style={{
        background: "#000000",
        boxShadow: "var(--shadow-lg)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3"
        style={{ height: "34px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#E74C3C" }} />
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#F1C40F" }} />
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#2ECC71" }} />
        <div className="ml-2 flex-1 rounded h-2 max-w-[140px]" style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>
      <div className="p-3.5 sm:p-4">
        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 min-h-[230px]">
          <div className="rounded-xl p-2.5 space-y-2" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {["70%", "88%", "58%", "76%"].map((width, i) => (
              <div
                key={i}
                className="rounded-lg p-2"
                style={{ background: i === 1 ? "rgba(74,144,226,0.16)" : "rgba(255,255,255,0.04)", border: i === 1 ? "1px solid rgba(74,144,226,0.28)" : "1px solid transparent" }}
              >
                <div className="h-1.5 rounded mb-1.5" style={{ width, background: i === 1 ? "rgba(74,144,226,0.45)" : "rgba(255,255,255,0.16)" }} />
                <div className="h-1 rounded" style={{ width: "52%", background: "rgba(255,255,255,0.08)" }} />
              </div>
            ))}
          </div>

          <div className="min-w-0 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "#4A90E2" }} />
              <div className="h-1.5 rounded flex-1 max-w-[150px]" style={{ background: "rgba(255,255,255,0.16)" }} />
              <div className="h-5 w-10 rounded-full" style={{ background: "rgba(46,204,113,0.16)", border: "1px solid rgba(46,204,113,0.22)" }} />
            </div>

            <div className="p-3 space-y-3">
              <div>
                <div className="h-3 rounded mb-2" style={{ width: "78%", background: "rgba(255,255,255,0.18)" }} />
                <div className="h-2 rounded" style={{ width: "46%", background: "rgba(255,255,255,0.08)" }} />
              </div>

              {[
                { accent: "#4A90E2", lines: 3, fill: "rgba(74,144,226,0.16)" },
                { accent: "#2ECC71", lines: 2, fill: "rgba(46,204,113,0.15)" },
                { accent: "#F1C40F", lines: 2, fill: "rgba(241,196,15,0.13)" },
              ].map((b, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.12)" }}
                >
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: b.fill }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: b.accent }} />
                    <div className="h-1.5 rounded" style={{ width: i === 0 ? "54%" : "40%", background: "rgba(255,255,255,0.2)" }} />
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    {Array.from({ length: b.lines }).map((_, line) => (
                      <div
                        key={line}
                        className="h-1.5 rounded"
                        style={{ width: line === b.lines - 1 ? "68%" : "100%", background: "rgba(255,255,255,0.09)" }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorShellIllustrationResponsive() {
  return (
    <>
      <div className="md:hidden w-full min-w-0">
        <EditorShellIllustrationCompact />
      </div>
      <div className="hidden md:block w-full min-w-0">
        <EditorShellIllustration />
      </div>
    </>
  );
}

/* ─── Feature card ─────────────────────────────────────────── */

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  accent?: string;
}

function FeatureCard({ icon: Icon, title, desc, accent = "#4A90E2" }: FeatureCardProps) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-6 transition-all group min-w-0"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-sm)",
        boxShadow: "var(--shadow-xs)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = accent + "33";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${accent}12, 0 2px 6px rgba(0,0,0,0.04)`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-sm)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xs)";
        (e.currentTarget as HTMLElement).style.transform = "none";
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: accent + "12" }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <h3
        className="font-bold mb-2"
        style={{ fontSize: "var(--text-md)", color: "var(--gray-900)" }}
      >
        {title}
      </h3>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", lineHeight: "var(--leading-relaxed)" }}>
        {desc}
      </p>
    </div>
  );
}

/* ─── Step ─────────────────────────────────────────────────── */

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4 sm:gap-5 min-w-0">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0"
          style={{
            background: "var(--brand-blue)",
            color: "white",
            fontSize: "var(--text-sm)",
          }}
        >
          {n}
        </div>
        <div
          className="flex-1 mt-2"
          style={{ width: "1px", background: "var(--border-sm)", minHeight: "32px" }}
        />
      </div>
      <div className="pb-8">
        <p
          className="font-bold mb-1.5"
          style={{ fontSize: "var(--text-md)", color: "var(--gray-900)" }}
        >
          {title}
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", lineHeight: "var(--leading-relaxed)" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────── */

export default function Landing() {
  const { session } = useAuth();
  const isAuthed = Boolean(session?.user);

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--bg-surface)", fontFamily: "var(--font-sans)", color: "var(--gray-900)" }}
    >
      {/* ══════════════════════════════
          HEADER
      ══════════════════════════════ */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: "var(--glass-surface)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-xs)",
        }}
      >
        <div
          className={`flex items-center justify-between gap-3 ${SHELL} h-14 sm:h-[60px]`}
        >
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0" aria-label="Версиум — главная">
            <BrandWordmark logoSize="sm" textClassName="text-[var(--text-md)]" />
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {[
              { href: "#features", label: "Возможности" },
              { href: "#how", label: "Как работает" },
              { href: "#benefits", label: "Преимущества" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="font-medium transition-colors"
                style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-900)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-500)")}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle variant="icon" />
            {isAuthed ? (
              <Link
                to="/app"
                className="vs-btn vs-btn-primary touch-manipulation min-h-11 sm:min-h-0"
              >
                <span className="hidden min-[420px]:inline">В приложение</span>
                <span className="min-[420px]:hidden">Приложение</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="vs-btn-ghost hidden sm:inline-flex"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  Войти
                </Link>
                <Link
                  to="/auth/register"
                  className="vs-btn vs-btn-primary touch-manipulation min-h-11 sm:min-h-0"
                >
                  <span className="hidden min-[420px]:inline">Начать бесплатно</span>
                  <span className="min-[420px]:hidden">Начать</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section
        className={`${SECTION_Y} pt-16 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 lg:pb-20`}
        style={{ background: "var(--landing-hero-bg)" }}
      >
        <div className={`${SHELL} relative`}>
          {/* Pill */}
          <div className="flex justify-center mb-6 sm:mb-7">
            <Badge>
              <Sparkles className="w-3 h-3 shrink-0" />
              <span className="text-left">ИИ-генерация учебных курсов</span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 xl:gap-16 items-center">
            {/* Copy + actions */}
            <div className="min-w-0 text-center lg:text-left order-1">
              <h1
                className="font-bold tracking-tight text-balance text-center lg:text-left mx-auto lg:mx-0 mb-4 sm:mb-5"
                style={{
                  fontSize: "clamp(1.75rem, 4vw + 1rem, 4.5rem)",
                  lineHeight: 1.08,
                  color: "var(--gray-900)",
                  letterSpacing: "-0.03em",
                }}
              >
                Создавайте курсы,
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>
                которые{" "}
                <span style={{ color: "var(--brand-blue)" }}>действительно работают</span>
              </h1>

              <p
                className="text-pretty mx-auto lg:mx-0 mb-6 sm:mb-8 max-w-[36rem]"
                style={{
                  fontSize: "clamp(0.9375rem, 1.2vw, 1.0625rem)",
                  color: "var(--gray-500)",
                  lineHeight: "var(--leading-relaxed)",
                }}
              >
                ИИ генерирует структуру и контент. Встроенный редактор, QA-проверка по 6 критериям
                и история версий по содержательным изменениям курса.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 mb-10 lg:mb-0">
                <Link
                  to="/auth"
                  className="vs-btn vs-btn-primary vs-btn-lg justify-center touch-manipulation min-h-12 w-full sm:w-auto"
                >
                  Создать первый курс
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
                <Link
                  to="/app"
                  className="vs-btn vs-btn-secondary vs-btn-lg justify-center touch-manipulation min-h-12 w-full sm:w-auto"
                >
                  Открыть приложение
                </Link>
              </div>
            </div>

            {/* Product illustration — десктоп справа, мобильный компактный вариант */}
            <div className="min-w-0 w-full max-w-[860px] mx-auto lg:mx-0 lg:max-w-none order-2">
              <EditorShellIllustrationResponsive />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          TRUST / STATS
      ══════════════════════════════ */}
      <section
        className="py-10 sm:py-12"
        style={{
          borderTop: "1px solid var(--border-xs)",
          borderBottom: "1px solid var(--border-xs)",
        }}
      >
        <div className="w-full max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-4 sm:gap-x-8 lg:gap-12 justify-items-center">
            {[
              { value: "6",    label: "Критериев качества QA",    accent: "var(--brand-blue)" },
              { value: "100%", label: "Проверка источников",      accent: "#2ECC71" },
              { value: "∞",    label: "Версий с откатом",         accent: "#F1C40F" },
              { value: "AI",   label: "Генерация структуры",      accent: "var(--brand-blue)" },
            ].map(({ value, label, accent }) => (
              <div key={label} className="text-center px-1 min-w-0 max-w-[11rem] sm:max-w-none">
                <p
                  className="font-bold leading-none mb-1 tabular-nums"
                  style={{
                    fontSize: "clamp(1.75rem, 4vw, 3rem)",
                    color: accent,
                  }}
                >
                  {value}
                </p>
                <p className="text-[11px] sm:text-xs leading-snug" style={{ color: "var(--gray-500)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          PROBLEM → SOLUTION
      ══════════════════════════════ */}
      <section id="features" className={SECTION_Y} style={{ background: "var(--bg-surface)" }}>
        <div className={SHELL}>
          <div className="grid md:grid-cols-2 gap-10 md:gap-14 lg:gap-16 items-center">
            {/* Problem */}
            <div>
              <SectionLabel>Проблема</SectionLabel>
              <h2
                className="font-bold tracking-tight mb-4 sm:mb-5 text-balance"
                style={{
                  fontSize: "clamp(1.375rem, 2.5vw, 2.25rem)",
                  color: "var(--gray-900)",
                  letterSpacing: "-0.02em",
                }}
              >
                Создание курса — это месяцы работы
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  "Сложно выстроить логичную структуру с нуля",
                  "Ручная проверка качества занимает дни",
                  "Нет систематического контроля версий",
                  "Сложно обеспечить соответствие источникам",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(231,76,60,0.1)" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#E74C3C" }} />
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-600)" }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Solution */}
            <div
              className="rounded-2xl p-5 sm:p-6 lg:p-8 min-w-0"
              style={{
                background: "rgba(74,144,226,0.04)",
                border: "1px solid rgba(74,144,226,0.15)",
              }}
            >
              <SectionLabel>Решение</SectionLabel>
              <h2
                className="font-bold tracking-tight mb-4 sm:mb-5 text-balance"
                style={{
                  fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
                  color: "var(--gray-900)",
                  letterSpacing: "-0.02em",
                }}
              >
                Версиум делает всё автоматически
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  "ИИ строит структуру курса по вашей теме",
                  "Автоматическая QA-проверка по 6 критериям",
                  "Полная история версий с откатом",
                  "Верификация каждого блока по источнику",
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(74,144,226,0.15)" }}
                    >
                      <Check className="w-2.5 h-2.5" style={{ color: "var(--brand-blue)" }} />
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)" }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          HOW IT WORKS
      ══════════════════════════════ */}
      <section
        id="how"
        className={SECTION_Y}
        style={{
          background: "var(--gray-50)",
          borderTop: "1px solid var(--border-xs)",
          borderBottom: "1px solid var(--border-xs)",
        }}
      >
        <div className={SHELL}>
          <div className="text-center mb-10 sm:mb-14 lg:mb-16">
            <SectionLabel>Как работает</SectionLabel>
            <h2
              className="font-bold tracking-tight text-balance px-2"
              style={{
                fontSize: "clamp(1.375rem, 2.5vw, 2.25rem)",
                color: "var(--gray-900)",
                letterSpacing: "-0.02em",
              }}
            >
              От идеи до готового курса
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-x-8 lg:gap-x-16 xl:gap-x-24 gap-y-0 max-w-4xl mx-auto md:max-w-none">
            <div>
              <Step
                n="1"
                title="Задайте тему и параметры"
                desc="Укажите тему, уровень, цель и длительность курса. Можно также загрузить исходные материалы."
              />
              <Step
                n="2"
                title="ИИ генерирует структуру"
                desc="Система создаёт модули, уроки и цели обучения. Вы получаете полноценный план курса за секунды."
              />
            </div>
            <div>
              <Step
                n="3"
                title="Редактируйте и улучшайте"
                desc="Встроенный редактор с AI-ассистентом. QA-проверка выявляет проблемы и предлагает решения."
              />
              <Step
                n="4"
                title="Публикуйте и обучайте"
                desc="Готовый курс доступен в режиме обучения. История версий фиксирует содержательные изменения курса."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FEATURES
      ══════════════════════════════ */}
      <section className={SECTION_Y} style={{ background: "var(--bg-surface)" }}>
        <div className={SHELL}>
          <div className="text-center mb-10 sm:mb-12 lg:mb-14">
            <SectionLabel>Возможности</SectionLabel>
            <h2
              className="font-bold tracking-tight text-balance px-2"
              style={{
                fontSize: "clamp(1.375rem, 2.5vw, 2.25rem)",
                color: "var(--gray-900)",
                letterSpacing: "-0.02em",
              }}
            >
              Всё для создания качественного курса
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            <FeatureCard
              icon={Sparkles}
              title="ИИ-генерация"
              desc="Автоматическое создание структуры, контента уроков, примеров и практических заданий."
            />
            <FeatureCard
              icon={FileText}
              title="Умный редактор"
              desc="3-колоночный редактор с деревом модулей, редактором блоков и AI-панелью помощника."
            />
            <FeatureCard
              icon={Shield}
              title="QA-система"
              desc="Автоматическая проверка по 6 критериям: структура, связность, сложность, соответствие целям."
              accent="#F1C40F"
            />
            <FeatureCard
              icon={History}
              title="Версионность"
              desc="Снимки состояний курса, сравнение версий и откат к любому предыдущему состоянию."
            />
            <FeatureCard
              icon={BookOpen}
              title="Режим обучения"
              desc="Встроенный плеер курса с навигацией по урокам, отслеживанием прогресса и квизами."
              accent="#2ECC71"
            />
            <FeatureCard
              icon={Layers}
              title="По источникам"
              desc="Загрузите PDF, ссылки или текст — ИИ создаст курс строго на основе ваших материалов."
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          PRODUCT PREVIEW
      ══════════════════════════════ */}
      <section
        className={`${SECTION_Y} overflow-hidden`}
        style={{
          background: "var(--gray-50)",
          borderTop: "1px solid var(--border-xs)",
          borderBottom: "1px solid var(--border-xs)",
        }}
      >
        <div className={SHELL}>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Text */}
            <div className="min-w-0 order-2 md:order-1 text-center md:text-left">
              <SectionLabel>Редактор</SectionLabel>
              <h2
                className="font-bold tracking-tight mb-4 sm:mb-5 text-balance"
                style={{
                  fontSize: "clamp(1.375rem, 2.5vw, 2.25rem)",
                  color: "var(--gray-900)",
                  letterSpacing: "-0.02em",
                }}
              >
                Профессиональный редактор для каждого урока
              </h2>
              <p
                className="mb-8"
                style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", lineHeight: "var(--leading-relaxed)" }}
              >
                Три панели: дерево структуры, холст контента и панель ИИ-ассистента. Каждый блок
                верифицируется по источникам и проверяется QA-системой в реальном времени.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { icon: Zap,       text: "AI перегенерирует блок по одному клику" },
                  { icon: Shield,    text: "QA-замечания прямо в редакторе" },
                  { icon: RefreshCw, text: "Автосохранение черновика и история версий-снимков" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(74,144,226,0.1)" }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: "var(--brand-blue)" }} />
                    </div>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)" }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Product illustration */}
            <div className="min-w-0 order-1 md:order-2">
              <EditorShellIllustrationResponsive />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          BENEFITS
      ══════════════════════════════ */}
      <section id="benefits" className={SECTION_Y} style={{ background: "var(--bg-surface)" }}>
        <div className={SHELL}>
          <div className="text-center mb-10 sm:mb-12 lg:mb-14">
            <SectionLabel>Преимущества</SectionLabel>
            <h2
              className="font-bold tracking-tight text-balance px-2"
              style={{
                fontSize: "clamp(1.375rem, 2.5vw, 2.25rem)",
                color: "var(--gray-900)",
                letterSpacing: "-0.02em",
              }}
            >
              Быстро. Качественно. Под контролем.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                icon: Zap,
                accent: "var(--brand-blue)",
                title: "В 10× быстрее",
                desc: "Курс, на создание которого уходили недели, теперь генерируется за минуты. ИИ берёт на себя рутинную работу.",
                stat: "~5 мин",
                statLabel: "на генерацию плана",
              },
              {
                icon: Shield,
                accent: "#F1C40F",
                title: "Высокое качество",
                desc: "Автоматическая проверка по 6 критериям гарантирует, что каждый урок соответствует стандартам.",
                stat: "6",
                statLabel: "критериев QA",
              },
              {
                icon: History,
                accent: "#2ECC71",
                title: "Полный контроль",
                desc: "История версий, откат к любой точке, сравнение изменений. Ничего не теряется.",
                stat: "100%",
                statLabel: "сохранность данных",
              },
            ].map(({ icon: Icon, accent, title, desc, stat, statLabel }) => (
              <div
                key={title}
                className="rounded-2xl p-5 sm:p-6 lg:p-7 min-w-0"
                style={{
                  background: "var(--gray-50)",
                  border: "1px solid var(--border-xs)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: accent + "12" }}
                >
                  <Icon className="w-5 h-5" style={{ color: accent }} />
                </div>
                <p
                  className="font-bold mb-2"
                  style={{ fontSize: "var(--text-md)", color: "var(--gray-900)" }}
                >
                  {title}
                </p>
                <p
                  className="mb-5"
                  style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", lineHeight: "var(--leading-relaxed)" }}
                >
                  {desc}
                </p>
                <div
                  className="pt-5"
                  style={{ borderTop: "1px solid var(--border-xs)" }}
                >
                  <p
                    className="font-bold tabular-nums"
                    style={{ fontSize: "var(--text-2xl)", color: accent, lineHeight: 1 }}
                  >
                    {stat}
                  </p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", marginTop: "4px" }}>
                    {statLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FINAL CTA
      ══════════════════════════════ */}
      <section className={`${SECTION_Y} px-4 sm:px-6`} style={{ background: "var(--landing-contrast-bg)" }}>
        <div className="text-center max-w-[36rem] mx-auto w-full px-2">
          <div className="flex justify-center mb-6">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold"
              style={{
                fontSize: "var(--text-xs)",
                background: "rgba(74,144,226,0.2)",
                color: "var(--landing-contrast-badge-text)",
                border: "1px solid rgba(74,144,226,0.3)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              Начните прямо сейчас
            </span>
          </div>

          <h2
            className="font-bold tracking-tight mb-4 sm:mb-5 text-balance"
            style={{
              fontSize: "clamp(1.5rem, 5vw, 3.25rem)",
              color: "white",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Создайте первый курс бесплатно
          </h2>

          <p
            className="mb-10"
            style={{
              fontSize: "var(--text-md)",
              color: "rgba(255,255,255,0.5)",
              lineHeight: "var(--leading-relaxed)",
            }}
          >
            Введите тему — и уже через минуту у вас будет готовый план курса с модулями, уроками и целями обучения.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full max-w-md sm:max-w-none mx-auto">
            <Link
              to="/auth"
              className="vs-btn vs-btn-primary vs-btn-lg justify-center touch-manipulation min-h-12 w-full sm:w-auto"
              style={{ boxShadow: "0 4px 20px rgba(74,144,226,0.4)" }}
            >
              Создать курс бесплатно
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
            <Link
              to="/app"
              className="vs-btn vs-btn-lg justify-center touch-manipulation min-h-12 w-full sm:w-auto"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Открыть приложение
              <ChevronRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FOOTER
      ══════════════════════════════ */}
      <footer
        style={{
          background: "var(--landing-contrast-bg)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
        className="py-8 sm:py-10"
      >
        <div
          className={`${SHELL} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8`}
        >
          {/* Brand */}
          <Link to="/" className="shrink-0" aria-label="Версиум — главная">
            <BrandWordmark
              logoSize="xs"
              logoTheme="dark"
              textClassName="font-semibold"
              textColor="rgba(255,255,255,0.66)"
            />
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:justify-center">
            {[
              { label: "Возможности", href: "#features", external: true },
              { label: "Как работает", href: "#how", external: true },
              { label: "Преимущества", href: "#benefits", external: true },
              ...(isAuthed
                ? [{ label: "В приложение", href: "/app", external: false as const }]
                : [{ label: "Войти", href: "/auth/login", external: false as const }]),
            ].map(({ label, href, external }) =>
              external ? (
                <a
                  key={label}
                  href={href}
                  className="touch-manipulation py-1 min-h-[44px] sm:min-h-0 flex items-center"
                  style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.35)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={label}
                  to={href}
                  className="touch-manipulation py-1 min-h-[44px] sm:min-h-0 flex items-center"
                  style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.35)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
                >
                  {label}
                </Link>
              ),
            )}
          </div>

          <p
            className="text-left sm:text-right sm:ml-auto"
            style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.25)" }}
          >
            © 2026 Версиум.
          </p>
        </div>
      </footer>
    </div>
  );
}
