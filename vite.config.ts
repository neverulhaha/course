import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const SUPABASE_URL_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
] as const

const SUPABASE_PUBLIC_KEY_KEYS = [
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PUBLISHABLE_OR_ANON_KEY',
  'VITE_PUBLIC_SUPABASE_ANON_KEY',
  'VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'VITE_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_OR_ANON_KEY',
] as const

function pickEnvValue(keys: readonly string[], fileEnv: Record<string, string>, proc: NodeJS.ProcessEnv): string {
  for (const key of keys) {
    const value = (proc[key] ?? fileEnv[key] ?? '').trim()
    if (value && value !== 'undefined' && value !== 'null') return value
  }
  return ''
}

function formatKeys(keys: readonly string[]): string {
  return keys.map((key) => `  - ${key}`).join('\n')
}

export default defineConfig(({ mode }) => {
  const root = process.cwd()
  const fileEnv = loadEnv(mode, root, '')
  const supabaseUrl = pickEnvValue(SUPABASE_URL_KEYS, fileEnv, process.env)
  const supabaseAnonKey = pickEnvValue(SUPABASE_PUBLIC_KEY_KEYS, fileEnv, process.env)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      [
        '[vite] Supabase env не найдены при сборке.',
        'Сборка продолжится, но авторизация будет работать только после деплоя/запуска с публичными Supabase env.',
        '',
        'URL можно передать через одну из переменных:',
        formatKeys(SUPABASE_URL_KEYS),
        '',
        'Публичный anon/publishable key можно передать через одну из переменных:',
        formatKeys(SUPABASE_PUBLIC_KEY_KEYS),
        '',
      ].join('\n')
    )
  }

  return {
    define: {
      __SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
