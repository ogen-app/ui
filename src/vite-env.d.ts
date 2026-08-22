/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  /** Absolute API origin for cross-origin deploys; empty = relative (proxied). */
  readonly VITE_API_URL?: string;

  /**
   * `"1"` builds the staging dev tools in — the per-browser flag overrides and
   * the `/flags` panel (`config/flagOverrides.ts`). Set on the staging service
   * only; anything else, including omitting it, folds them out of the bundle.
   */
  readonly VITE_DEV_TOOLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
