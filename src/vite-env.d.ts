/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  /** Absolute API origin for cross-origin deploys; empty = relative (proxied). */
  readonly VITE_API_URL?: string

  /**
   * Local fallbacks for the runtime keys in `Window['__OGEN_CONFIG__']`, used
   * only when `env.js` leaves a key out — `pnpm dev`, `vite preview`, tests.
   * An image sets these at container start instead; the Dockerfile does not
   * pass them. See `config/runtimeConfig.ts`.
   */
  readonly VITE_DEV_TOOLS?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string

  /** Release tag (build SHA), aligned with the API's `SENTRY_RELEASE`. */
  readonly VITE_APP_RELEASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  /**
   * Written by `docker/entrypoint.sh` into `/env.js` at container start, from
   * the container's environment — these keys and no others. A key the
   * container leaves unset is absent. See `config/runtimeConfig.ts`.
   */
  __OGEN_CONFIG__?: {
    SENTRY_DSN?: string
    SENTRY_ENVIRONMENT?: string
    SENTRY_TRACES_SAMPLE_RATE?: string
    DEV_TOOLS?: string
  }
}
