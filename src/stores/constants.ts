// Zustand persist configuration
export const AUTH_STORE_PERSIST_KEY = 'auth-store'
export const SETTINGS_STORE_PERSIST_KEY = 'settings-store'

/**
 * The chosen language. Read and written directly rather than through zustand's
 * `persist` middleware, because `bootstrapLocale` needs it synchronously,
 * before React mounts, to decide whether the first paint is the app or the
 * switching screen — and because the login screen has to honour it with no
 * session to read `/api/settings` with. Device-local for the same reason.
 */
export const LOCALE_STORAGE_KEY = 'locale'
