import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "@/lib/supabase/client";
import * as authService from "@/services/auth.service";
import SuspenseFallback from "@/app/SuspenseFallback";

/**
 * Redirect URI для OAuth (Google) и ссылок из писем Supabase (подтверждение email).
 * PKCE + `detectSessionInUrl`: при загрузке с `?code=` сессия подхватывается в `getSession()`.
 */
function readOAuthErrorFromUrl(): { code: string; description?: string } | null {
  const search = new URLSearchParams(window.location.search);
  let code = search.get("error");
  let description = search.get("error_description") ?? undefined;

  if (!code && window.location.hash.length > 1) {
    const hp = new URLSearchParams(window.location.hash.slice(1));
    code = hp.get("error");
    description = hp.get("error_description") ?? description;
  }

  if (!code) return null;
  return { code, description: description ?? undefined };
}

async function waitForSession(maxAttempts = 5, delayMs = 150): Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>> {
  let last: Awaited<ReturnType<typeof supabase.auth.getSession>> | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    last = await supabase.auth.getSession();
    if (last.data.session || last.error) return last;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return last ?? { data: { session: null }, error: null };
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const urlErr = readOAuthErrorFromUrl();
      if (urlErr) {
        authService.clearOAuthFlowMarkers();
        if (!active) return;
        setMessage(authService.oauthRedirectErrorMessage(urlErr.code, urlErr.description));
        return;
      }

      const { data: { session }, error } = await waitForSession();

      if (!active) return;

      if (error) {
        authService.clearOAuthFlowMarkers();
        setMessage(authService.authErrorMessage(error));
        return;
      }

      if (session) {
        const next = authService.consumeOAuthReturnPath();
        if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(authService.OAUTH_GOOGLE_FLOW_KEY) === "1") {
          sessionStorage.removeItem(authService.OAUTH_GOOGLE_FLOW_KEY);
          sessionStorage.setItem(authService.OAUTH_SUCCESS_BANNER_KEY, authService.OAUTH_SUCCESS_BANNER_TEXT);
        }
        navigate(next, { replace: true });
        return;
      }

      authService.clearOAuthFlowMarkers();
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
