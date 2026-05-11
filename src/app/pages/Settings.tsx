import { useState } from "react";
import { Link } from "react-router";
import { BookOpen, Monitor, Moon } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/app/providers/ThemeProvider";
import { SettingsForm, SettingsLayout, SettingsSection, ToggleSwitch } from "@/app/components/settings";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/providers/ProfileProvider";
import { normalizeProfileRole, profileRoleLabel, isTeacherRole } from "@/lib/profileRole";
import { updateProfilePreferences } from "@/services/profile.service";
import { toUserErrorMessage } from "@/lib/errorMessages";

const FONT = "'Montserrat', sans-serif";

const NAV = [
  { href: "#settings-general", label: "Оформление" },
  { href: "#settings-learning", label: "Режимы" },
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

function LearningNavigationSection() {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const role = normalizeProfileRole(profile?.app_role);
  const isTeacher = isTeacherRole(role);
  const [saving, setSaving] = useState(false);

  const hidden = Boolean(profile?.hide_learning_navigation);

  const handleToggle = async (value: boolean) => {
    if (!user?.id || !isTeacher) return;
    setSaving(true);
    const { error } = await updateProfilePreferences(user.id, { hide_learning_navigation: value });
    setSaving(false);
    if (error) {
      toast.error(toUserErrorMessage(error, "Не удалось сохранить настройку."));
      return;
    }
    await refresh();
    toast.success(value ? "Разделы прохождения скрыты из меню" : "Разделы прохождения снова видны в меню");
  };

  return (
    <SettingsSection
      id="settings-learning"
      title="Режимы работы"
      subtitle="Настройте, какие сценарии показывать в интерфейсе."
    >
      <SettingsForm>
        <div className="flex min-w-0 items-start justify-between gap-4 rounded-2xl border border-[var(--border-xs)] bg-[var(--gray-50)] p-4">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(74,144,226,0.08)] text-[var(--brand-blue)]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[var(--gray-900)]" style={{ fontFamily: FONT }}>
                Скрыть прохождение курсов в левом меню
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--gray-500)]" style={{ fontFamily: FONT }}>
                Доступно только для роли «Преподаватель». Если включить, пункты «Прогресс» и «Учиться» не будут отображаться в боковом меню.
              </p>
              {!isTeacher && (
                <p className="mt-2 text-[11px] font-semibold text-[var(--gray-400)]" style={{ fontFamily: FONT }}>
                  Текущая роль: {profileRoleLabel(role)}. Для автора курсов прохождение всегда доступно без ограничений.
                </p>
              )}
            </div>
          </div>
          <ToggleSwitch
            pressed={hidden && isTeacher}
            onPressedChange={(value) => void handleToggle(value)}
            aria-label="Скрыть прохождение курсов в меню"
            disabled={!isTeacher || saving}
          />
        </div>
      </SettingsForm>
    </SettingsSection>
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

      <LearningNavigationSection />

      <p
        className="border-t border-[var(--border-xs)] pt-5 text-center text-[11px] leading-relaxed sm:text-left"
        style={{ fontFamily: FONT, color: "var(--gray-400)" }}
      >
        Имя, email и роль —{" "}
        <Link to="/app/profile" className="font-semibold text-[var(--brand-blue)] underline-offset-2 hover:underline">
          в личном кабинете
        </Link>
        .
      </p>
    </SettingsLayout>
  );
}
