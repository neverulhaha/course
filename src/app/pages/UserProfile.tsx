import { useState } from "react";
import { Link } from "react-router";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  Trash2,
  Check,
} from "lucide-react";

/* ─── Constants ───────────────────────────────────────────── */

const FONT = "'Montserrat', sans-serif";

/* ─── Mock user data ──────────────────────────────────────── */

const MOCK_USER = {
  name:      "Пользователь",
  email:     "user@example.com",
  role:      "Студент",
  joinDate:  "1 января 2024",
  initials:  "ПЛ",
};

/* ─── Shared input style ──────────────────────────────────── */

const inputBase: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  height: 44,
  fontFamily: FONT, fontWeight: 500, fontSize: "13.5px",
  color: "var(--gray-900)",
  background: "var(--bg-surface)",
  border: "1px solid var(--border-sm)",
  borderRadius: 10, padding: "0 14px",
  outline: "none", boxSizing: "border-box" as const,
  transition: "border-color 0.15s",
};

/* ─── Section wrapper ─────────────────────────────────────── */

function SectionCard({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="min-w-0 overflow-hidden rounded-2xl"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-xs)",
        boxShadow: "var(--shadow-xs)",
        fontFamily: FONT,
      }}
    >
      {/* Section header */}
      <div
        className="border-b border-[var(--border-xs)] px-4 py-3.5 sm:px-5 sm:py-4"
        style={{ background: "var(--gray-50)" }}
      >
        <p
          className="text-xs font-extrabold sm:text-[13px]"
          style={{
            fontFamily: FONT,
            color: "var(--gray-900)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="mt-0.5 text-[11px] leading-snug sm:text-[11.5px]"
            style={{
              fontFamily: FONT,
              color: "var(--gray-500)",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/* ─── Field row ───────────────────────────────────────────── */

function FieldRow({
  label, value, icon: Icon, editable, type = "text",
}: {
  label: string; value: string; icon?: React.ElementType;
  editable?: boolean; type?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:gap-1.5">
      <label
        className="text-[9px] font-bold sm:text-[10px]"
        style={{
          fontFamily: FONT,
          color: "var(--gray-500)",
          letterSpacing: "0.07em", textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <div className="relative min-w-0">
        {Icon && (
          <div
            className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center sm:left-[13px]"
            style={{ color: "var(--gray-400)" }}
          >
            <Icon className="h-[15px] w-[15px] shrink-0" />
          </div>
        )}
        <input
          type={type}
          defaultValue={value}
          readOnly={!editable}
          className="min-h-11 w-full max-w-full touch-manipulation sm:min-h-0"
          style={{
            ...inputBase,
            paddingLeft: Icon ? 40 : 14,
            background: editable ? "var(--bg-subtle)" : "var(--gray-50)",
            color: editable ? "var(--gray-900)" : "var(--gray-600)",
            cursor: editable ? "text" : "default",
          }}
          onFocus={(e) => {
            if (editable) e.currentTarget.style.borderColor = "var(--brand-blue)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-sm)";
          }}
        />
      </div>
    </div>
  );
}

/* ─── Personal info section ───────────────────────────────── */

function PersonalInfoSection() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <SectionCard title="Личные данные" subtitle="Обновите имя и прочую информацию">
      <div className="flex flex-col gap-4 sm:gap-4 md:gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 lg:gap-5">
          <FieldRow label="Имя" value={MOCK_USER.name} icon={User} editable />
          <FieldRow label="Email" value={MOCK_USER.email} icon={Mail} />
        </div>
        <FieldRow label="Роль" value={MOCK_USER.role} />

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 sm:pt-1">
          {saved && (
            <span
              className="inline-flex items-center justify-center gap-1.5 text-center text-xs font-bold sm:justify-end"
              style={{ fontFamily: FONT, color: "#2ECC71" }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Сохранено
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-[9px] px-[18px] py-2 text-[12.5px] font-bold text-white sm:min-h-0 sm:w-auto"
            style={{
              fontFamily: FONT,
              background: "var(--brand-blue)",
              border: "none", cursor: "pointer", transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {saved ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            Сохранить
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

/* ─── Security section ────────────────────────────────────── */

function SecuritySection() {
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew,     setShowNew]       = useState(false);
  const [currentPw,   setCurrentPw]     = useState("");
  const [newPw,       setNewPw]         = useState("");
  const [confirmPw,   setConfirmPw]     = useState("");
  const [saved,       setSaved]         = useState(false);

  const canSave = currentPw.length > 0 && newPw.length >= 8 && newPw === confirmPw;

  const handleSave = () => {
    if (!canSave) return;
    setSaved(true);
    setTimeout(() => { setSaved(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }, 3000);
  };

  const pwStrength = newPw.length === 0 ? 0 : newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : 3;
  const strengthColors = ["var(--gray-200)", "#E74C3C", "#F1C40F", "#2ECC71"];
  const strengthLabels = ["", "Слабый", "Средний", "Надёжный"];

  return (
    <SectionCard title="Безопасность" subtitle="Обновите пароль для защиты аккаунта">
      <div className="flex flex-col gap-4 sm:gap-4 md:gap-5">
        {/* Current password */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-[9px] font-bold sm:text-[10px]" style={{ fontFamily: FONT, color: "var(--gray-500)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Текущий пароль
          </label>
          <div className="relative min-w-0">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 sm:left-[13px]" style={{ color: "var(--gray-400)" }} />
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Введите текущий пароль"
              className="min-h-11 w-full max-w-full touch-manipulation pr-12 sm:min-h-0"
              style={{ ...inputBase, paddingLeft: 40, paddingRight: 44 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-blue)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-sm)")}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-lg border-0 bg-transparent sm:right-2 sm:min-h-0 sm:min-w-0 sm:p-1"
              style={{ cursor: "pointer", color: "var(--gray-400)" }}
              aria-label={showCurrent ? "Скрыть пароль" : "Показать пароль"}
            >
              {showCurrent ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-[9px] font-bold sm:text-[10px]" style={{ fontFamily: FONT, color: "var(--gray-500)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Новый пароль
          </label>
          <div className="relative min-w-0">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 sm:left-[13px]" style={{ color: "var(--gray-400)" }} />
            <input
              type={showNew ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Минимум 8 символов"
              className="min-h-11 w-full max-w-full touch-manipulation pr-12 sm:min-h-0"
              style={{ ...inputBase, paddingLeft: 40, paddingRight: 44 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-blue)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-sm)")}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-lg border-0 bg-transparent sm:right-2 sm:min-h-0 sm:min-w-0 sm:p-1"
              style={{ cursor: "pointer", color: "var(--gray-400)" }}
              aria-label={showNew ? "Скрыть пароль" : "Показать пароль"}
            >
              {showNew ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
            </button>
          </div>

          {/* Strength bar */}
          {newPw.length > 0 && (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex min-w-0 flex-1 gap-1">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className="min-h-[3px] min-w-0 flex-1 rounded-full"
                    style={{
                      background: level <= pwStrength ? strengthColors[pwStrength] : "var(--gray-150)",
                      transition: "background 0.2s",
                    }}
                  />
                ))}
              </div>
              <span className="shrink-0 text-[10px] font-bold" style={{ fontFamily: FONT, color: strengthColors[pwStrength] }}>
                {strengthLabels[pwStrength]}
              </span>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <label className="text-[9px] font-bold sm:text-[10px]" style={{ fontFamily: FONT, color: "var(--gray-500)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Повторите пароль
          </label>
          <div className="relative min-w-0">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 sm:left-[13px]" style={{ color: "var(--gray-400)" }} />
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Повторите новый пароль"
              className="min-h-11 w-full max-w-full touch-manipulation sm:min-h-0"
              style={{
                ...inputBase, paddingLeft: 40,
                borderColor: confirmPw.length > 0 && confirmPw !== newPw ? "#E74C3C" : "var(--border-sm)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-blue)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = confirmPw.length > 0 && confirmPw !== newPw ? "#E74C3C" : "var(--border-sm)")}
            />
          </div>
          {confirmPw.length > 0 && confirmPw !== newPw && (
            <p className="text-[11px]" style={{ fontFamily: FONT, color: "#E74C3C" }}>Пароли не совпадают</p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 sm:pt-1">
          {saved && (
            <span className="inline-flex items-center justify-center gap-1.5 text-center text-xs font-bold sm:justify-end" style={{ fontFamily: FONT, color: "#2ECC71" }}>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Пароль изменён
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-[9px] px-[18px] py-2 text-[12.5px] font-bold text-white sm:min-h-0 sm:w-auto"
            style={{
              fontFamily: FONT,
              background: canSave ? "var(--brand-blue)" : "var(--gray-200)",
              border: "none",
              cursor: canSave ? "pointer" : "not-allowed",
              transition: "all 0.12s",
              opacity: canSave ? 1 : 0.7,
            }}
          >
            <Shield className="h-[13px] w-[13px] shrink-0" />
            Изменить пароль
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

/* ─── Notifications (placeholder) ────────────────────────── */

function NotificationsSection() {
  const [enabled, setEnabled] = useState(true);

  const toggles = [
    { label: "Завершение генерации",  sub: "Когда ИИ закончит создание курса", key: "gen"   },
    { label: "Результаты QA",         sub: "После каждой проверки качества",    key: "qa"    },
    { label: "Напоминания об уроках",  sub: "Не пропускайте учебные сессии",    key: "remind"},
  ];

  const [states, setStates] = useState<Record<string, boolean>>({ gen: true, qa: true, remind: false });

  return (
    <SectionCard title="Уведомления" subtitle="Настройте, что вы хотите получать">
      <div className="flex flex-col gap-3 sm:gap-3">
        {toggles.map(({ label, sub, key }) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-xs)] bg-[var(--gray-50)] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-3.5 sm:py-3"
          >
            <div className="min-w-0 flex-1 pr-0 sm:pr-2">
              <p className="text-[13px] font-semibold leading-snug" style={{ fontFamily: FONT, color: "var(--gray-900)" }}>
                {label}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed" style={{ fontFamily: FONT, color: "var(--gray-500)" }}>
                {sub}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStates((s) => ({ ...s, [key]: !s[key] }))}
              className="relative h-[21px] w-[38px] shrink-0 self-end touch-manipulation rounded-[11px] border-0 sm:ml-0 sm:self-center"
              style={{
                background: states[key] ? "var(--brand-blue)" : "var(--gray-200)",
                cursor: "pointer", transition: "background 0.2s",
              }}
              aria-pressed={states[key]}
              aria-label={`${label}: ${states[key] ? "вкл" : "выкл"}`}
            >
              <span
                className="absolute top-0.5 rounded-full bg-[var(--bg-surface)] shadow-sm transition-[left]"
                style={{
                  width: 17, height: 17,
                  left: states[key] ? 19 : 2,
                }}
              />
            </button>
          </div>
        ))}
      </div>
      {/* suppress unused var warning */}
      <span style={{ display: "none" }}>{String(enabled)}</span>
    </SectionCard>
  );
}

/* ─── Account actions ─────────────────────────────────────── */

function AccountActionsSection() {
  return (
    <SectionCard title="Аккаунт">
      <div className="flex flex-col gap-2 sm:gap-2">
        <Link
          to="/auth/login"
          className="flex min-h-[52px] touch-manipulation items-center justify-between gap-3 rounded-[10px] border border-[var(--border-xs)] bg-[var(--gray-50)] px-3.5 py-3 no-underline sm:min-h-0 sm:px-3.5 sm:py-3"
          style={{ transition: "all 0.12s" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--brand-blue)";
            (e.currentTarget as HTMLElement).style.background = "rgba(74,144,226,0.03)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-xs)";
            (e.currentTarget as HTMLElement).style.background = "var(--gray-50)";
          }}
        >
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(74,144,226,0.08)" }}>
              <LogOut className="h-[15px] w-[15px] shrink-0" style={{ color: "var(--brand-blue)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-snug" style={{ fontFamily: FONT, color: "var(--gray-900)" }}>
                Выйти из аккаунта
              </p>
              <p className="text-[11px] leading-snug" style={{ fontFamily: FONT, color: "var(--gray-400)" }}>
                Завершить текущую сессию
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--gray-400)" }} />
        </Link>

        {/* Delete account */}
        <button
          type="button"
          className="flex min-h-[52px] w-full touch-manipulation items-center justify-between gap-3 rounded-[10px] border border-transparent bg-transparent px-3.5 py-3 text-left transition-all sm:min-h-0 sm:py-3"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(231,76,60,0.04)";
            e.currentTarget.style.borderColor = "rgba(231,76,60,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(231,76,60,0.08)" }}>
              <Trash2 className="h-[15px] w-[15px] shrink-0" style={{ color: "#E74C3C" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-snug" style={{ fontFamily: FONT, color: "#E74C3C" }}>
                Удалить аккаунт
              </p>
              <p className="text-[11px] leading-snug" style={{ fontFamily: FONT, color: "var(--gray-400)" }}>
                Это действие необратимо
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--gray-400)" }} />
        </button>
      </div>
    </SectionCard>
  );
}

/* ─── Main page ───────────────────────────────────────────── */

export default function UserProfile() {
  return (
    <div className="min-h-dvh min-h-[100vh]" style={{ fontFamily: FONT, background: "var(--bg-page)" }}>

      {/* Page header */}
      <div
        className="border-b border-[var(--border-xs)] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7 lg:px-8 lg:pb-6 lg:pt-8"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="mx-auto max-w-[1100px]">
          <h1
            className="mb-1.5 text-[22px] font-extrabold leading-tight sm:text-2xl lg:text-[var(--text-2xl)]"
            style={{
              fontFamily: FONT,
              color: "var(--gray-900)", letterSpacing: "-0.025em",
            }}
          >
            Профиль
          </h1>
          <p className="max-w-xl text-[11px] leading-relaxed sm:text-[var(--text-xs)]" style={{ fontFamily: FONT, color: "var(--gray-400)" }}>
            Управляйте своими данными и настройками аккаунта
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">

        {/* User card (avatar + identity) */}
        <div
          className="mb-4 flex flex-col items-center gap-4 rounded-2xl border border-[var(--border-xs)] p-4 shadow-[var(--shadow-xs)] sm:mb-5 sm:flex-row sm:items-center sm:gap-5 sm:p-5 md:p-6"
          style={{
            background: "var(--bg-surface)",
            fontFamily: FONT,
          }}
        >
          {/* Avatar */}
          <div
            className="flex h-[56px] w-[56px] shrink-0 select-none items-center justify-center rounded-[16px] text-lg font-extrabold sm:h-16 sm:w-16 sm:rounded-[18px] sm:text-xl"
            style={{
              background: "rgba(74,144,226,0.1)",
              border: "2px solid rgba(74,144,226,0.2)",
              fontFamily: FONT,
              color: "var(--brand-blue)",
            }}
          >
            {MOCK_USER.initials}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1 max-sm:w-full max-sm:text-center sm:text-left">
            <p
              className="mb-1 text-[17px] font-extrabold leading-snug sm:text-lg"
              style={{
                fontFamily: FONT,
                color: "var(--gray-900)",
                letterSpacing: "-0.015em",
              }}
            >
              {MOCK_USER.name}
            </p>
            <p className="mb-2 break-all text-xs font-medium sm:text-[13px]" style={{ fontFamily: FONT, color: "var(--gray-500)" }}>
              {MOCK_USER.email}
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[10px] font-bold"
                style={{
                  fontFamily: FONT,
                  background: "rgba(74,144,226,0.08)", color: "var(--brand-blue)",
                }}
              >
                <Bell className="h-2.5 w-2.5 shrink-0" />
                {MOCK_USER.role}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[10px] font-semibold"
                style={{
                  fontFamily: FONT,
                  color: "var(--gray-500)", background: "var(--gray-100)",
                }}
              >
                С {MOCK_USER.joinDate}
              </span>
            </div>
          </div>
        </div>

        {/* Sections: single column &lt; xl; two columns xl+ (Personal+Security | Notifications+Account) */}
        <div className="flex flex-col gap-4 sm:gap-5 xl:grid xl:grid-cols-2 xl:items-start xl:gap-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            <PersonalInfoSection />
            <SecuritySection />
          </div>
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            <NotificationsSection />
            <AccountActionsSection />
          </div>
        </div>
      </div>
    </div>
  );
}
