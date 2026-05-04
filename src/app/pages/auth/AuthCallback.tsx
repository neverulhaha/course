import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { getAuthErrorMessage, handleAuthCallback, OAUTH_SUCCESS_BANNER_KEY } from "@/services/auth.service";

function safeNextPath(search: string) {
  const next = new URLSearchParams(search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/auth")) return "/app";
  return next;
}

export default function AuthCallback() {
  const location = useLocation();
  const nextPath = useMemo(() => safeNextPath(location.search), [location.search]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    handleAuthCallback()
      .then(() => {
        try {
          sessionStorage.setItem(OAUTH_SUCCESS_BANNER_KEY, "Вход через Google выполнен.");
        } catch {
          /* sessionStorage недоступен */
        }
        if (isMounted) window.location.replace(nextPath);
      })
      .catch((err) => { if (isMounted) setError(getAuthErrorMessage(err)); });
    return () => { isMounted = false; };
  }, [nextPath]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {error ? <><h1 className="text-xl font-bold">Не удалось завершить вход</h1><p className="mt-3 text-sm text-red-600">{error}</p><Link className="mt-6 inline-flex rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white" to="/auth/login">Вернуться ко входу</Link></> : <><h1 className="text-xl font-bold">Завершаем вход…</h1><p className="mt-3 text-sm text-slate-500">Проверяем сессию и подготавливаем профиль.</p></>}
      </section>
    </main>
  );
}
