import { useState } from "react";
import { Link } from "react-router";
import { Mail, ArrowLeft, CheckCircle, Send } from "lucide-react";
import { AuthLayout, AuthCard, InputField } from "./AuthLayout";
import * as authService from "@/services/auth.service";

function SuccessState({ email }: { email: string }) {
  return (
    <AuthCard>
      <div className="text-center min-w-0">
        {/* Icon */}
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto"
          style={{
            background: "rgba(46,204,113,0.08)",
            border: "1px solid rgba(46,204,113,0.2)",
            marginBottom: "clamp(14px, 3vw, 20px)",
          }}
        >
          <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" style={{ color: "#2ECC71" }} />
        </div>

        <h2
          className="font-bold tracking-tight text-balance px-1"
          style={{
            fontSize: "clamp(1.125rem, 3.5vw, 1.375rem)",
            color: "var(--gray-900)",
            letterSpacing: "-0.02em",
            marginBottom: "8px",
          }}
        >
          Письмо отправлено
        </h2>

        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--gray-500)",
            lineHeight: "var(--leading-relaxed)",
            marginBottom: "6px",
          }}
        >
          Мы отправили инструкции по сбросу пароля на
        </p>
        <p
          className="font-semibold break-all px-1"
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--gray-900)",
            marginBottom: "clamp(20px, 4vw, 28px)",
          }}
        >
          {email}
        </p>

        {/* Help */}
        <div
          className="rounded-xl text-left"
          style={{
            background: "var(--gray-50)",
            border: "1px solid var(--border-xs)",
            padding: "clamp(12px, 3vw, 16px)",
            marginBottom: "clamp(18px, 4vw, 24px)",
          }}
        >
          <p
            className="vs-section-label"
            style={{ marginBottom: "8px" }}
          >
            Что дальше?
          </p>
          <ol
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              paddingLeft: "16px",
              listStyleType: "decimal",
            }}
          >
            {[
              "Откройте письмо в вашем почтовом клиенте",
              "Нажмите на ссылку сброса пароля",
              "Придумайте новый надёжный пароль",
            ].map((step) => (
              <li
                key={step}
                style={{ fontSize: "var(--text-xs)", color: "var(--gray-600)" }}
              >
                {step}
              </li>
            ))}
          </ol>
        </div>

        <p
          className="text-pretty px-0.5"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--gray-400)",
            marginBottom: "clamp(16px, 3vw, 20px)",
          }}
        >
          Не получили письмо? Проверьте папку «Спам» или{" "}
          <button
            type="button"
            className="font-semibold transition-colors touch-manipulation min-h-11 inline-flex items-center px-0.5 -mx-0.5"
            style={{ color: "var(--brand-blue)", background: "none", border: "none", cursor: "pointer" }}
          >
            отправьте повторно
          </button>
        </p>

        <Link
          to="/auth/login"
          className="vs-btn vs-btn-secondary w-full touch-manipulation min-h-12 sm:min-h-[44px]"
          style={{ fontSize: "var(--text-sm)", justifyContent: "center" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Вернуться к входу
        </Link>
      </div>
    </AuthCard>
  );
}

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(authService.authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      heading="Восстановим доступ к аккаунту"
      tagline="Укажите email — мы пришлём ссылку для создания нового пароля."
    >
      {submitted ? (
        <SuccessState email={email} />
      ) : (
        <AuthCard>
          {/* Back link */}
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-1.5 font-semibold transition-colors touch-manipulation min-h-11 -ml-1 px-1 rounded-lg"
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--gray-400)",
              marginBottom: "clamp(16px, 3vw, 24px)",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-700)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-400)")}
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            Назад к входу
          </Link>

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
              Сброс пароля
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)", lineHeight: "var(--leading-relaxed)" }}>
              Введите email, привязанный к аккаунту
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
            <div className="min-w-0">
              <label className="vs-label">Email</label>
              <div className="relative">
                <Mail
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ left: "14px", color: "var(--gray-400)", pointerEvents: "none" }}
                />
                <input
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                  className="vs-input w-full min-h-[48px] sm:min-h-[44px] touch-manipulation"
                  style={{ paddingLeft: "40px", paddingRight: "14px", fontSize: "max(16px, var(--text-sm))" }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="vs-btn vs-btn-primary w-full touch-manipulation min-h-12 sm:min-h-[44px]"
              style={{ fontSize: "var(--text-sm)", justifyContent: "center", marginTop: "4px" }}
            >
              <Send className="w-4 h-4" />
              {loading ? "Отправка…" : "Отправить ссылку"}
            </button>
          </form>

          {/* Info */}
          <p
            className="text-center text-pretty px-1"
            style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", marginTop: "18px" }}
          >
            Нет аккаунта?{" "}
            <Link
              to="/auth/register"
              className="font-semibold touch-manipulation inline-block py-1"
              style={{ color: "var(--brand-blue)" }}
            >
              Зарегистрироваться
            </Link>
          </p>
        </AuthCard>
      )}
    </AuthLayout>
  );
}
