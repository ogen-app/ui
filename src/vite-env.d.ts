/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  /** Absolute API origin for cross-origin deploys; empty = relative (proxied). */
  readonly VITE_API_URL?: string

  /**
   * `"1"` builds the staging dev tools in — the per-browser flag overrides and
   * the `/flags` panel (`config/flagOverrides.ts`). Set on the staging service
   * only; anything else, including omitting it, folds them out of the bundle.
   */
  readonly VITE_DEV_TOOLS?: string

  /**
   * Sentry error monitoring + tracing (CON-304). Empty ⇒ telemetry off
   * (fail-open); dev is unaffected. See `observability/sentry.ts`.
   */
  readonly VITE_SENTRY_DSN?: string
  /** Sentry environment tag, e.g. `production`. Defaults to `development`. */
  readonly VITE_SENTRY_ENVIRONMENT?: string
  /** Browser-trace head sample rate, `0`–`1`. Defaults to `0.1`. */
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
  /** Release tag (build SHA), aligned with the API's `SENTRY_RELEASE`. */
  readonly VITE_APP_RELEASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
