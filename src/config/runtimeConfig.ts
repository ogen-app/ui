/**
 * Configuration the deploy decides, read when the page loads rather than when
 * the bundle is built (CON-518).
 *
 * One image runs in development and in production, so anything that differs
 * between them cannot be compiled in. The container's entrypoint
 * (`docker/entrypoint.sh`) writes `/env.js` from its environment at start, and
 * `index.html` loads that as a classic script ahead of the bundle, so
 * `window.__OGEN_CONFIG__` is in place before any module runs.
 *
 * The entrypoint writes an allow-list of keys — the four in `RuntimeKey` — and
 * nothing else in the container's environment can reach the browser. A key it
 * leaves out (unset in the container) falls back to the build's
 * `VITE_<key>`, which is how `pnpm dev`, `vite preview` and the tests get their
 * values: the checked-in `public/env.js` is an empty object.
 *
 * What stays compiled in, deliberately: `VITE_APP_RELEASE` (one image is one
 * release) and `VITE_API_URL` (empty — the API is same-origin behind Caddy).
 *
 * Read once, at module load. The values cannot change under a loaded page, and
 * a snapshot keeps every reader a property lookup.
 */

type RuntimeKey = keyof NonNullable<Window['__OGEN_CONFIG__']>

/** What a key resolves to when `env.js` leaves it out. */
const BUILD_FALLBACK: Record<RuntimeKey, string | undefined> = {
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  SENTRY_ENVIRONMENT: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  SENTRY_TRACES_SAMPLE_RATE: import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
  DEV_TOOLS: import.meta.env.VITE_DEV_TOOLS,
}

function read(key: RuntimeKey): string | undefined {
  const value = window.__OGEN_CONFIG__?.[key]
  return typeof value === 'string' ? value : BUILD_FALLBACK[key]
}

/** Clamp the head sample rate to [0, 1], defaulting to 0.1 (CON-302 D3). */
function parseSampleRate(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return 0.1
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.1
}

export interface RuntimeConfig {
  /** Empty ⇒ telemetry off (fail-open). See `observability/sentry.ts`. */
  sentryDsn: string
  /** Sentry's environment tag. `development` unless the deploy says otherwise. */
  sentryEnvironment: string
  /** Browser-trace head sample rate, `0`–`1`. */
  sentryTracesSampleRate: number
  /**
   * The per-browser flag overrides, the `/flags` panel and the analytics demo
   * (`config/flagOverrides.ts`). Always on under `pnpm dev`; in an image, only
   * when the container sets `DEV_TOOLS=1` — anything else, unset included, is
   * off, which is the direction a mistake should fail in.
   */
  devTools: boolean
}

export const runtimeConfig: RuntimeConfig = {
  sentryDsn: read('SENTRY_DSN') ?? '',
  sentryEnvironment: read('SENTRY_ENVIRONMENT') || 'development',
  sentryTracesSampleRate: parseSampleRate(read('SENTRY_TRACES_SAMPLE_RATE')),
  devTools: import.meta.env.DEV || read('DEV_TOOLS') === '1',
}
