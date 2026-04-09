import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { AuthLayout, AuthCard } from "./AuthLayout";
import * as authService from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import SuspenseFallback from "@/app/SuspenseFallback";

/**
 * Страница после перехода по ссылке «Сброс пароля» из письма Supabase (`redirectTo`).
 */
export default function UpdatePassword() {
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authService.updatePassword(password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(authService.authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <SuspenseFallback />;
  }

  if (!user) {
    return (
      <AuthLayout heading="Сессия сброса не найдена" tagline="Откройте ссылку из письма ещё раз или запросите новую.">
        <AuthCard>
          <Link
            to="/auth/forgot"
            className="vs-btn vs-btn-primary w-full touch-manipulation min-h-12"
            style={{ fontSize: "var(--text-sm)", justifyContent: "center", textDecoration: "none" }}
          >
            Запросить ссылку снова
          </Link>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout heading="Новый пароль" tagline="Придумайте надёжный пароль для входа в аккаунт.">
      <AuthCard>
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

          <div>
            <label className="vs-label" htmlFor="new-password">
              Новый пароль
            </label>
            <div className="relative">
              <Lock
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ left: "14px", color: "var(--gray-400)" }}
              />
              <input
                id="new-password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                disabled={submitting}
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
                onClick={() => setShow(!show)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-11 min-h-11 rounded transition-colors touch-manipulation"
                style={{ color: "var(--gray-400)" }}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="vs-btn vs-btn-primary w-full touch-manipulation min-h-12 sm:min-h-[44px]"
            style={{ fontSize: "var(--text-sm)", justifyContent: "center", marginTop: "4px" }}
          >
            {submitting ? "Сохранение…" : "Сохранить пароль"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
