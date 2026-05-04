/// <reference types="vite/client" />

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ImportMetaEnv {
  /* Supabase env подставляется через __SUPABASE_* в vite.config.ts */
}

/** Подставляются в `vite.config.ts` из VITE_* / NEXT_PUBLIC_* / SUPABASE_* (см. `src/lib/supabase/client.ts`). */
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
