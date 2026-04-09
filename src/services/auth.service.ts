import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export function authErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as AuthError).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  if (error instanceof Error) return error.message;
  return "Что-то пошло не так";
}

function appOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("Сессия не получена");
  return data.session;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string
): Promise<{ session: Session | null; user: User | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${appOrigin()}/auth/callback`,
    },
  });
  if (error) throw error;
  return { session: data.session, user: data.user };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${appOrigin()}/auth/update-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}
