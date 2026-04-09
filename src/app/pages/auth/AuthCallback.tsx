import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase/client";
import SuspenseFallback from "@/app/SuspenseFallback";

/**
 * Redirect URI для OAuth и ссылок из писем Supabase (подтверждение email и т.п.).
 * После обмена кода/фрагмента URL сессия подхватывается клиентом (`detectSessionInUrl`).
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setMessage(error.message);
        return;
      }

      if (session) {
        navigate("/app", { replace: true });
        return;
      }

      setMessage("Не удалось войти. Ссылка могла устареть — запросите новую.");
    })();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (message) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--bg-page)" }}
      >
        <div
          className="max-w-md w-full rounded-xl p-6"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-xs)",
          }}
        >
          <p style={{ fontSize: "var(--text-sm)", color: "#C0392B", marginBottom: 16 }}>{message}</p>
          <button
            type="button"
            className="vs-btn vs-btn-primary w-full touch-manipulation min-h-12"
            style={{ fontSize: "var(--text-sm)", justifyContent: "center" }}
            onClick={() => navigate("/auth/login", { replace: true })}
          >
            На страницу входа
          </button>
        </div>
      </div>
    );
  }

  return <SuspenseFallback />;
}
