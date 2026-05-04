import { Link } from "react-router";
import { Lock } from "lucide-react";

export default function Forbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-6 text-center">
      <section className="w-full max-w-md rounded-[2rem] border border-[var(--border-xs)] bg-[var(--bg-surface)] p-8 shadow-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-red-50 text-red-600"><Lock className="size-8" /></div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[var(--gray-900)]">Нет доступа</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--gray-500)]">У вас нет доступа к этому разделу или объекту. Проверьте аккаунт и вернитесь к своим курсам.</p>
        <Link to="/app" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-bold text-white no-underline">К моим курсам</Link>
      </section>
    </main>
  );
}
