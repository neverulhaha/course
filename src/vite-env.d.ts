/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

/** Подставляются в `vite.config.ts` из NEXT_PUBLIC_* / SUPABASE_* (см. `src/lib/supabase/client.ts`). */
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
