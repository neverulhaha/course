import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function pickSupabaseUrl(env: Record<string, string>, proc: NodeJS.ProcessEnv): string {
  return (
    proc.NEXT_PUBLIC_SUPABASE_URL ||
    proc.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    ''
  ).trim()
}

/** Только публичные ключи; SUPABASE_SERVICE_ROLE_KEY и SUPABASE_SECRET_KEY в клиент не попадают. */
function pickSupabaseAnonKey(env: Record<string, string>, proc: NodeJS.ProcessEnv): string {
  return (
    proc.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    proc.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    proc.SUPABASE_ANON_KEY ||
    proc.SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim()
}

export default defineConfig(({ mode }) => {
  const root = process.cwd()
  const fileEnv = loadEnv(mode, root, '')
  const supabaseUrl = pickSupabaseUrl(fileEnv, process.env)
  const supabaseAnonKey = pickSupabaseAnonKey(fileEnv, process.env)

  return {
    define: {
      __SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
    },
    server: {
      proxy: process.env.VITE_API_PROXY_TARGET
        ? {
            "/api": {
              target: process.env.VITE_API_PROXY_TARGET,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
