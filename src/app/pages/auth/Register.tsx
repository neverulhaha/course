import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthLayout, AuthCard, InputField, AuthDivider } from "./AuthLayout";
import { GoogleSignInButton } from "./GoogleSignInButton";
import * as authService from "@/services/auth.service";

function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length > 0) {
    if (password.length < 10) {
      score = 1;
    } else {
      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasDigit = /[0-9]/.test(password);
      const hasSpec = /[!@#$%^&*()_+\-=[\]{}|;:,.?/`~]/.test(password);
      const n = [hasLower, hasUpper, hasDigit, hasSpec].filter(Boolean).length;
      if (n === 4) score = 4;
      else if (n >= 2) score = 3;
      else score = 2;
    }
  }

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

type RegisterLocationState = {
  from?: Pick<Location, "pathname" | "search" | "hash">;
};

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const regState = (location.state ?? null) as RegisterLocationState | null;
  const from = regState?.from;
  const oauthNextPath =
    from?.pathname && from.pathname !== "/auth/register"
      ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
      : "/app";

  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { session } = await authService.signUpWithPassword(
        email.trim(),
        password,
        name.trim()
      );
      if (session) {
        navigate("/app", { replace: true });
        return;
      }
      navigate("/auth/login", {
        replace: true,
        state: {
          registrationMessage:
            "Регистрация прошла успешно. Если в проекте включено подтверждение email, проверьте почту и перейдите по ссылке — затем войдите с паролём.",
        },
      });
    } catch (err) {
      const msg = authService.authErrorMessage(err);
      if (
        err &&
        typeof err === "object" &&
        (err as { code?: string }).code === "EMAIL_REGISTERED_WITH_GOOGLE"
      ) {
        setError(null);
        toast.error(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
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
          {error && (
            <div
              role="alert"
              className="rounded-lg px-3 py-2"
              style={{
                fontSize: "var(--text-sm)",
                background: "rgba(231, 76, 60, 0.1)",
                color: "#C0392B",
              }}
            >
              {error}
            </div>
          )}

          <InputField
            id="register-name"
            name="name"
            label="Имя"
            icon={User}
            type="text"
            placeholder="Иван Иванов"
            autoComplete="name"
            required
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            disabled={loading}
          />

          <InputField
            id="register-email"
            name="email"
            label="Email"
            icon={Mail}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            disabled={loading}
          />

          {/* Password with strength */}
          <div>
            <label className="vs-label" htmlFor="register-password">
              Пароль
            </label>
            <div className="relative">
              <Lock
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ left: "14px", color: "var(--gray-400)" }}
              />
              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="От 10 символов: a–z, A–Z, цифра, спецсимвол"
                autoComplete="new-password"
                required
                value={password}
                disabled={loading}
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
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--gray-500)",
                marginTop: "6px",
                lineHeight: "var(--leading-snug)",
              }}
            >
              Требования: ≥10 символов, латиница a–z и A–Z, цифра, спецсимвол; без части email и без вашего имени в пароле.
            </p>
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
            disabled={loading}
            className="vs-btn vs-btn-primary w-full touch-manipulation min-h-12 sm:min-h-[44px]"
            style={{ fontSize: "var(--text-sm)", justifyContent: "center", marginTop: "4px" }}
          >
            {loading ? "Создание…" : "Создать аккаунт"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 sm:mt-6 flex flex-col gap-3">
          <AuthDivider />
          <GoogleSignInButton
            nextPath={oauthNextPath}
            disabled={loading}
            onError={(msg) => setError(msg || null)}
          />
        </div>

        <div className="mt-5 sm:mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="vs-btn vs-btn-secondary w-full touch-manipulation min-h-12 sm:min-h-[44px]"
            style={{ fontSize: "var(--text-sm)", justifyContent: "center" }}
          >
            На главную
          </button>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
