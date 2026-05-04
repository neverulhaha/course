import { Link, useLocation } from "react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function LoadError() {
  const location = useLocation();
  const state = location.state as { message?: string } | null;
  const message = state?.message || "Не удалось загрузить данные. Попробуйте обновить страницу.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-6 text-center">
      <section className="w-full max-w-md rounded-[2rem] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-8 shadow-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600">
          <AlertTriangle className="size-8" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[var(--gray-900)]">Ошибка загрузки</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--gray-500)]">{message}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-bold text-white">
            <RefreshCw className="size-4" />
            Обновить
          </button>
          <Link to="/app" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-xs)] px-5 text-sm font-bold text-[var(--gray-700)] no-underline">
            К моим курсам
          </Link>
        </div>
      </section>
    </main>
  );
}
