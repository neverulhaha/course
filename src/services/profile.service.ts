import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { ProfileRow } from "@/types/database";

export type AuthProvider = "email" | "google" | "unknown";

export interface ProfilePatch {
  display_name?: string | null;
  provider?: AuthProvider;
}

export interface UpsertProfilePayload {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  name?: string | null;
  email?: string | null;
  provider?: AuthProvider | null;
  app_role?: string | null;
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

function normalizeProvider(raw: unknown): AuthProvider {
  if (raw === "google") return "google";
  if (raw === "email") return "email";
  return "unknown";
}

function getProviderFromUser(user: User): AuthProvider {
  const appProvider = normalizeProvider(user.app_metadata?.provider);
  if (appProvider !== "unknown") return appProvider;
  const identities = Array.isArray(user.identities) ? user.identities : [];
  return normalizeProvider(identities.find((i) => i.provider === "google" || i.provider === "email")?.provider);
}

function getDisplayNameFromUser(user: User) {
  const metadata = user.user_metadata ?? {};
  const value = metadata.full_name || metadata.name || metadata.display_name || user.email?.split("@")[0] || null;
  return typeof value === "string" ? value.trim() || null : null;
}

function buildProfilePayload(payload: UpsertProfilePayload) {
  const displayName = payload.display_name?.trim() || payload.full_name?.trim() || payload.name?.trim() || null;
  return {
    id: payload.id,
    email: normalizeEmail(payload.email),
    full_name: displayName,
    display_name: displayName,
    provider: payload.provider ?? null,
    app_role: payload.app_role ?? "student",
    updated_at: new Date().toISOString(),
  };
}

export async function fetchProfile(id: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.warn("Profile read failed", error.message);
    return null;
  }
  return (data as ProfileRow | null) ?? null;
}

export async function upsertProfile(payload: UpsertProfilePayload) {
  return supabase.from("profiles").upsert(buildProfilePayload(payload), { onConflict: "id" }).select().maybeSingle();
}

export async function ensureProfile(user: User): Promise<ProfileRow | null> {
  const existing = await fetchProfile(user.id);
  if (existing) {
    const displayName = existing.display_name || existing.full_name || getDisplayNameFromUser(user);
    void upsertProfile({
      id: user.id,
      email: user.email,
      provider: getProviderFromUser(user),
      display_name: displayName,
      app_role: existing.app_role ?? "student",
    }).then(({ error }) => {
      if (error) console.warn("Profile sync failed", error.message);
    });
    return existing;
  }
  const { data, error } = await upsertProfile({
    id: user.id,
    email: user.email,
    provider: getProviderFromUser(user),
    display_name: getDisplayNameFromUser(user),
    app_role: "student",
  });
  if (error) {
    console.warn("Profile ensure failed", error.message);
    return null;
  }
  return (data as ProfileRow | null) ?? null;
}

export async function upsertProfileForUser(user: User, patch: ProfilePatch = {}) {
  const { data, error } = await upsertProfile({
    id: user.id,
    email: user.email,
    provider: patch.provider ?? getProviderFromUser(user),
    display_name: patch.display_name ?? getDisplayNameFromUser(user),
    app_role: "student",
  });
  if (error) {
    console.warn("Profile upsert failed", error.message);
    return null;
  }
  return data;
}

export async function getCurrentProfile() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user?.id) return null;
  return fetchProfile(sessionData.session.user.id);
}
