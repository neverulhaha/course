import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthLayout, AuthCard, InputField, AuthDivider } from "./AuthLayout";

function PasswordStrength({ password }: { password: string }) {
  const score =
    password.length === 0 ? 0 :
    password.length < 6   ? 1 :
    password.length < 10  ? 2 :
    /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;

  const segments = [
    { min: 1, color: "#E74C3C" },
    { min: 2, color: "#F1C40F" },
    { min: 3, color: "var(--brand-blue)" },
    { min: 4, color: "#2ECC71" },
  ];

  const labels: Record<number, string> = {
    0: "",
    1: "Слабый",
    2: "Средний",
    3: "Хороший",
    4: "Надёжный",
  };

  const activeColor = score > 0 ? segments[score - 1].color : "transparent";

  if (password.length === 0) return null;

  return (
    <div style={{ marginTop: "6px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "4px",
          marginBottom: "5px",
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              height: "3px",
              background: score >= seg.min ? activeColor : "var(--gray-200)",
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: "var(--text-xs)", color: activeColor, fontWeight: 600 }}>
        {labels[score]}
      </p>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <AuthLayout
      heading="Создайте аккаунт и начните работать"
      tagline="Попробуйте платформу бесплатно — создайте первый курс за несколько минут."
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
            Регистрация
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", lineHeight: "var(--leading-relaxed)" }}>
            Уже есть аккаунт?{" "}
            <Link
              to="/auth/login"
              className="font-semibold transition-colors touch-manipulation inline-block py-0.5"
              style={{ color: "var(--brand-blue)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-blue-dark)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-blue)")}
            >
              Войти
            </Link>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField
            label="Имя"
            icon={User}
            type="text"
            placeholder="Иван Иванов"
            autoComplete="name"
            required
          />

          <InputField
            label="Email"
            icon={Mail}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          {/* Password with strength */}
          <div>
            <label className="vs-label">Пароль</label>
            <div className="relative">
              <Lock
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ left: "14px", color: "var(--gray-400)" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="vs-input w-full min-h-[48px] sm:min-h-[44px] touch-manipulation"
                style={{
                  paddingLeft: "40px",
                  paddingRight: "44px",
                  fontSize: "max(16px, var(--text-sm))",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-11 min-h-11 rounded transition-colors touch-manipulation"
                style={{ color: "var(--gray-400)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-700)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-400)")}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Terms */}
          <label
            className="flex items-start gap-3 cursor-pointer touch-manipulation py-1"
            style={{ marginTop: "2px" }}
          >
            <input
              type="checkbox"
              required
              className="rounded shrink-0 mt-0.5"
              style={{ accentColor: "var(--brand-blue)", width: "18px", height: "18px" }}
            />
            <span
              className="min-w-0"
              style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", lineHeight: "var(--leading-snug)" }}
            >
              Я согласен с{" "}
              <a href="#" className="underline-offset-2 touch-manipulation" style={{ color: "var(--brand-blue)" }}>
                условиями использования
              </a>{" "}
              и{" "}
              <a href="#" className="underline-offset-2 touch-manipulation" style={{ color: "var(--brand-blue)" }}>
                политикой конфиденциальности
              </a>
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            className="vs-btn vs-btn-primary w-full touch-manipulation min-h-12 sm:min-h-[44px]"
            style={{ fontSize: "var(--text-sm)", justifyContent: "center", marginTop: "4px" }}
          >
            Создать аккаунт
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
            Попробовать без регистрации
          </button>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
