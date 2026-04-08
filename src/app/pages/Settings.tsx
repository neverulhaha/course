import { useState } from "react";
import { Link } from "react-router";
import { Globe, Monitor, Moon } from "lucide-react";
import { useTheme } from "@/app/providers/ThemeProvider";
import { SettingsForm, SettingsLayout, SettingsSection, ToggleSwitch } from "@/app/components/settings";

const FONT = "'Montserrat', sans-serif";

const NAV = [
  { href: "#settings-general", label: "Общие" },
  { href: "#settings-system", label: "Система" },
];

function ThemeSegmented() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span
        className="text-[9px] font-bold sm:text-[10px]"
        style={{
          fontFamily: FONT,
          color: "var(--gray-500)",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        Тема оформления
      </span>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:max-w-md sm:rounded-[10px] sm:border sm:border-[var(--border-sm)] sm:p-0.5">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[10px] border border-[var(--border-sm)] px-3 text-[12.5px] font-bold sm:min-h-9 sm:flex-1 sm:rounded-md sm:border-transparent sm:px-4"
          style={{
            fontFamily: FONT,
            background: theme === "light" ? "var(--brand-blue)" : "transparent",
            color: theme === "light" ? "white" : "var(--gray-600)",
            cursor: "pointer",
            transition: "all 0.12s",
          }}
        >
          <Monitor className="h-4 w-4 shrink-0 opacity-90" />
          Светлая
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[10px] border border-[var(--border-sm)] px-3 text-[12.5px] font-bold sm:min-h-9 sm:flex-1 sm:rounded-md sm:border-transparent sm:px-4"
          style={{
            fontFamily: FONT,
            background: theme === "dark" ? "var(--brand-blue)" : "transparent",
            color: theme === "dark" ? "white" : "var(--gray-600)",
            cursor: "pointer",
            transition: "all 0.12s",
          }}
        >
          <Moon className="h-4 w-4 shrink-0 opacity-90" />
          Тёмная
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [language, setLanguage] = useState("ru");
  const [compactLists, setCompactLists] = useState(false);
  const [autosave, setAutosave] = useState(true);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);

  return (
    <SettingsLayout
      title="Настройки"
      subtitle="Интерфейс и поведение приложения. Данные аккаунта — в личном кабинете."
      navItems={NAV}
    >
      <SettingsSection
        id="settings-general"
        title="Общие"
        subtitle="Язык интерфейса и отображение"
      >
        <SettingsForm>
          <div className="flex min-w-0 flex-col gap-2">
            <span
              className="text-[9px] font-bold sm:text-[10px]"
              style={{
                fontFamily: FONT,
                color: "var(--gray-500)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              Язык интерфейса
            </span>
            <div className="relative min-w-0">
              <Globe
                className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 sm:left-[13px]"
                style={{ color: "var(--gray-400)" }}
              />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="min-h-11 w-full max-w-full cursor-pointer touch-manipulation appearance-none rounded-[10px] border border-[var(--border-sm)] bg-[var(--bg-subtle)] py-0 pl-10 pr-10 text-[13.5px] font-medium sm:min-h-[44px]"
                style={{ fontFamily: FONT, color: "var(--gray-900)" }}
              >
                <option value="ru">Русский</option>
                <option value="en">English (UI)</option>
              </select>
            </div>
          </div>

          <ThemeSegmented />

          <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-xs)] bg-[var(--gray-50)] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-3.5 sm:py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ fontFamily: FONT, color: "var(--gray-900)" }}>
                Компактные списки
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed" style={{ fontFamily: FONT, color: "var(--gray-500)" }}>
                Меньше вертикальных отступов в таблицах и списках курсов
              </p>
            </div>
            <ToggleSwitch
              pressed={compactLists}
              onPressedChange={setCompactLists}
              aria-label="Компактные списки"
            />
          </div>
        </SettingsForm>
      </SettingsSection>

      <SettingsSection
        id="settings-system"
        title="Система"
        subtitle="Поведение редактора и приложения"
      >
        <SettingsForm className="gap-3 sm:gap-3">
          <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-xs)] bg-[var(--gray-50)] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-3.5 sm:py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ fontFamily: FONT, color: "var(--gray-900)" }}>
                Автосохранение черновиков
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed" style={{ fontFamily: FONT, color: "var(--gray-500)" }}>
                Сохранять изменения в редакторе без лишних кликов
              </p>
            </div>
            <ToggleSwitch pressed={autosave} onPressedChange={setAutosave} aria-label="Автосохранение черновиков" />
          </div>
          <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-xs)] bg-[var(--gray-50)] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-3.5 sm:py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ fontFamily: FONT, color: "var(--gray-900)" }}>
                Диагностические данные
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed" style={{ fontFamily: FONT, color: "var(--gray-500)" }}>
                Помогать улучшать стабильность (анонимно, по желанию)
              </p>
            </div>
            <ToggleSwitch pressed={analyticsOptIn} onPressedChange={setAnalyticsOptIn} aria-label="Диагностические данные" />
          </div>
        </SettingsForm>
      </SettingsSection>

      <p
        className="border-t border-[var(--border-xs)] pt-5 text-center text-[11px] leading-relaxed sm:text-left"
        style={{ fontFamily: FONT, color: "var(--gray-400)" }}
      >
        Имя, email, пароль, уведомления, выход и удаление аккаунта —{" "}
        <Link
          to="/app/profile"
          className="font-semibold text-[var(--brand-blue)] underline-offset-2 hover:underline"
        >
          в личном кабинете
        </Link>
        .
      </p>
    </SettingsLayout>
  );
}
