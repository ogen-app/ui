// Per-platform character limits for post content. The backend has no
// `char_limit` on the platform row or in `post-type-rules`, so the editor
// owns these for now.
//
// FOLLOW-UP — CON-91: the backend should own per-platform (ideally
// per-post-type) character limits and expose them alongside the post-type
// rules; this map is deleted once it does.
//
// Keyed by platform Sqid — see `platformDictionary.ts`.

export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  AXqWG7U2qnpt: 3000, // LinkedIn
  pQ4yxT3SuE57: 500, // Threads
  rzgpTkARLH0L: 2200, // Instagram (caption)
  '81mUCmc2xsKd': 280, // X — the free tier's limit
  zBU1zqVICGfk: 63206, // Facebook
}

export function getCharLimit(platformId: string): number | undefined {
  return PLATFORM_CHAR_LIMITS[platformId]
}
