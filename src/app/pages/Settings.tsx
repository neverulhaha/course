import { Link } from "react-router";
import { Monitor, Moon } from "lucide-react";
import { useTheme } from "@/app/providers/ThemeProvider";
import { SettingsForm, SettingsLayout, SettingsSection } from "@/app/components/settings";

const FONT = "'Montserrat', sans-serif";

const NAV = [{ href: "#settings-general", label: "Оформление" }];

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
  return (
    <SettingsLayout title="Настройки" subtitle="Оформление интерфейса и параметры аккаунта." navItems={NAV}>
      <SettingsSection id="settings-general" title="Оформление" subtitle="Выберите удобный внешний вид приложения">
        <SettingsForm>
          <ThemeSegmented />
        </SettingsForm>
      </SettingsSection>

      <p
        className="border-t border-[var(--border-xs)] pt-5 text-center text-[11px] leading-relaxed sm:text-left"
        style={{ fontFamily: FONT, color: "var(--gray-400)" }}
      >
        Имя, email и выход из аккаунта —{" "}
        <Link to="/app/profile" className="font-semibold text-[var(--brand-blue)] underline-offset-2 hover:underline">
          в личном кабинете
        </Link>
        .
      </p>
    </SettingsLayout>
  );
}
