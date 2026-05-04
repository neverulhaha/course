import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { getAuthErrorCode, getAuthErrorMessage, signInWithGoogle, signUpWithEmail, type AuthErrorCode } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";

function resolveNextPath(location: ReturnType<typeof useLocation>) {
  const state = location.state as { from?: { pathname?: string; search?: string } } | null;
  const fromPath = state?.from?.pathname;
  if (fromPath && fromPath.startsWith("/") && !fromPath.startsWith("/auth")) return `${fromPath}${state?.from?.search ?? ""}`;
  const queryNext = new URLSearchParams(location.search).get("next");
  if (queryNext && queryNext.startsWith("/") && !queryNext.startsWith("//") && !queryNext.startsWith("/auth")) return queryNext;
  return "/app";
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const nextPath = useMemo(() => resolveNextPath(location), [location]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null);

  useEffect(() => { if (!loading && session?.user) navigate(nextPath, { replace: true }); }, [loading, navigate, nextPath, session?.user]);
  function setAuthError(err: unknown) { setError(getAuthErrorMessage(err)); setErrorCode(getAuthErrorCode(err)); }
  async function onSubmit(event: FormEvent) { event.preventDefault(); setIsBusy(true); setError(null); setErrorCode(null); try { await signUpWithEmail({ email, password, passwordConfirm, name }); navigate(nextPath, { replace: true }); } catch (err) { setAuthError(err); } finally { setIsBusy(false); } }
  async function onGoogleClick() { setIsBusy(true); setError(null); setErrorCode(null); try { await signInWithGoogle(nextPath); } catch (err) { setAuthError(err); setIsBusy(false); } }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950"><section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-2"><p className="text-sm font-semibold text-blue-600">Версиум</p><h1 className="text-2xl font-bold tracking-tight">Создание аккаунта</h1><p className="text-sm text-slate-500">Заполните данные для доступа к личному кабинету.</p></div>
      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{error}</p>{errorCode === "AUTH_EMAIL_USED_WITH_GOOGLE" ? <button className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={onGoogleClick} disabled={isBusy}>Войти через Google</button> : null}{errorCode === "AUTH_EMAIL_ALREADY_EXISTS" ? <Link className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100" to="/auth/login">Перейти ко входу</Link> : null}</div> : null}
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Имя</span><input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={name} onChange={(event) => setName(event.target.value)} type="text" autoComplete="name" placeholder="Как к вам обращаться" disabled={isBusy} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Почта</span><input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" disabled={isBusy} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Пароль</span><input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" placeholder="Минимум 6 символов" disabled={isBusy} /></label>
        <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Повторите пароль</span><input className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} type="password" autoComplete="new-password" placeholder="Ещё раз пароль" disabled={isBusy} /></label>
        <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isBusy || loading}>{isBusy ? "Создаём…" : "Зарегистрироваться"}</button>
      </form>
      <button className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={onGoogleClick} disabled={isBusy || loading}>Войти через Google</button>
      <p className="mt-6 text-center text-sm text-slate-500">Уже есть аккаунт? <Link className="font-semibold text-blue-600 hover:text-blue-700" to="/auth/login">Войти</Link></p>
    </section></main>
  );
}
