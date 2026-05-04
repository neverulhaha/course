/// <reference types="vite/client" />

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ImportMetaEnv {
  /* Supabase env подставляется через __SUPABASE_* в vite.config.ts */
}

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
