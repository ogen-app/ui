// Validation limits the backend does NOT yet encode, hardcoded on the
// frontend so the Validations panel can check them today.
//
// FOLLOW-UP — CON-91: the backend should own per-platform/per-content-type
// character limits and expose them alongside `post-type-rules`, at which
// point these constants are deleted in favour of the API.
// https://linear.app/ogen/issue/CON-91
//
// Keyed by platform Sqid (see `platformDictionary.ts`).

export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  AXqWG7U2qnpt: 3000, // LinkedIn
  pQ4yxT3SuE57: 500, // Threads
};

export function getCharLimit(platformId: string): number | undefined {
  return PLATFORM_CHAR_LIMITS[platformId];
}
