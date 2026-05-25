import path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    tailwindcss(),
    react(),
    ...(mode === 'test'
      ? []
      : [
          cloudflare({
            configPath: process.env.CF_WRANGLER_CONFIG ?? 'wrangler.toml',
            persistState: process.env.CF_PERSIST_STATE_PATH ? { path: process.env.CF_PERSIST_STATE_PATH } : true,
          }),
        ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
  server: {
    port: 4179,
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      exclude: [
        'server/auth.ts',
        'src/features/account/account-center.tsx',
        'src/features/console/console.tsx',
        'src/features/auth/auth-pages.tsx',
      ],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    environment: 'jsdom',
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
}))
