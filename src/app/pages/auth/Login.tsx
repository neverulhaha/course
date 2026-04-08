import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthLayout, AuthCard, InputField, AuthDivider } from "./AuthLayout";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <AuthLayout
      heading={"С возвращением.\nПродолжите работу."}
      tagline="Войдите в аккаунт и вернитесь к созданию курсов — ваши данные сохранены."
    >
      <AuthCard>
        {/* Heading */}
        <div className="mb-5 sm:mb-7">
          <h2
            className="font-bold tracking-tight text-balance"
            style={{
              fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
              color: "var(--gray-900)",
              letterSpacing: "-0.02em",
              marginBottom: "6px",
            }}
          >
            Вход в аккаунт
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", lineHeight: "var(--leading-relaxed)" }}>
            Нет аккаунта?{" "}
            <Link
              to="/auth/register"
              className="font-semibold transition-colors touch-manipulation inline-block py-0.5"
              style={{ color: "var(--brand-blue)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-blue-dark)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-blue)")}
            >
              Зарегистрироваться
            </Link>
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 sm:gap-4"
        >
          <InputField
            label="Email"
            icon={Mail}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <InputField
            label="Пароль"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center justify-center min-w-11 min-h-11 rounded transition-colors touch-manipulation -mr-1"
                style={{ color: "var(--gray-400)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-700)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-400)")}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          {/* Remember me + forgot */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <label className="flex items-center gap-2.5 cursor-pointer touch-manipulation min-h-11 sm:min-h-0 py-1 sm:py-0">
              <input
                type="checkbox"
                className="rounded shrink-0"
                style={{ accentColor: "var(--brand-blue)", width: "18px", height: "18px" }}
              />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-600)" }}>
                Запомнить меня
              </span>
            </label>
            <Link
              to="/auth/forgot"
              className="font-semibold transition-colors touch-manipulation min-h-11 sm:min-h-0 inline-flex items-center py-1 sm:py-0 self-start sm:self-auto"
              style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-blue)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-500)")}
            >
              Забыли пароль?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="vs-btn vs-btn-primary w-full touch-manipulation min-h-12 sm:min-h-[44px]"
            style={{ fontSize: "var(--text-sm)", justifyContent: "center", marginTop: "4px" }}
          >
            Войти в аккаунт
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider + guest */}
        <div className="mt-5 sm:mt-6 flex flex-col gap-3">
          <AuthDivider />
          <button
            type="button"
            onClick={() => navigate("/app")}
            className="vs-btn vs-btn-secondary w-full touch-manipulation min-h-12 sm:min-h-[44px]"
            style={{ fontSize: "var(--text-sm)", justifyContent: "center" }}
          >
            Войти как гость
          </button>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
