/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-vite-plugin'
import svgr from 'vite-plugin-svgr'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const uiPort = Number(env.PORT ?? 9002)

  return {
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          exportType: 'default',
        },
      }),
      tanstackRouter({
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
        routeFileIgnorePattern: '(page\\.tsx$|\\.test\\.(ts|tsx)$)',
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    json: {
      stringify: false, // Import JSON as parsed objects, not stringified
    },
    test: {
      // Git worktrees under .claude/worktrees hold whole checkouts of this
      // repo; without this, vitest runs their stale test copies too and the
      // suite reports phantom counts (and phantom failures).
      exclude: [...configDefaults.exclude, '**/.claude/**'],
      // jsdom for everything rather than per-file environments: the pure-logic
      // suite doesn't care, and a component test that silently ran in node
      // fails with "document is not defined" a long way from the cause.
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
    server: {
      // Polling lets HMR see host edits inside Docker bind mounts (native
      // inotify events don't cross the mount on macOS/Windows). It's CPU-hungry
      // — it stat()s the watched tree on every tick — so enable it ONLY when
      // asked (the docker-compose `ui` service sets CHOKIDAR_USEPOLLING) and at
      // a relaxed interval. A native `pnpm dev` outside Docker leaves `watch`
      // undefined and uses event-based watching, so it doesn't spin a core idle.
      watch:
        process.env.CHOKIDAR_USEPOLLING === 'true'
          ? {
              usePolling: true,
              interval: 1000,
              // Polling stat()s every watched file each tick, so keep the set
              // small: skip deps/build/store dirs. (node_modules/.git are also
              // excluded by Vite's defaults; listed here in case a bind mount
              // surfaces them — .pnpm-store especially is huge.)
              ignored: [
                '**/node_modules/**',
                '**/.pnpm-store/**',
                '**/dist/**',
                '**/.git/**',
              ],
            }
          : undefined,
      // Tell the browser which port to use for the HMR WebSocket. Must match
      // the host-side port exposed in docker-compose.yml. `PORT` (from
      // `.env.local`) lets a git worktree run its own dev server alongside the
      // main checkout; `strictPort` makes a collision fail loudly instead of
      // silently moving to a port the HMR client isn't pointed at.
      port: uiPort,
      strictPort: true,
      hmr: {
        clientPort: uiPort,
      },
      proxy: {
        // Forward API calls to the Go server during development.
        '/api': {
          target: env.API_URL ?? 'http://localhost:9001',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2022',
      minify: command === 'build' ? 'terser' : 'esbuild',
      terserOptions:
        command === 'build'
          ? ({
              compress: {
                // Remove console.log in production builds only
                // Keeps console.info, console.warn, console.error
                pure_funcs: ['console.log'],
              },
            } as Record<string, unknown>)
          : undefined,
    },
  }
})
