// Validation limits the backend does NOT yet encode, hardcoded on the
// frontend so the Validations panel can check them today.
//
// FOLLOW-UP — CON-91: the backend should own per-platform/per-content-type
// character limits and expose them alongside `post-type-rules`, at which
// point these constants are deleted in favour of the API.
// https://linear.app/ogen/issue/CON-91
//
import { LINKEDIN_PLATFORM_ID, THREADS_PLATFORM_ID } from "./platformDictionary";

export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  [LINKEDIN_PLATFORM_ID]: 3000,
  [THREADS_PLATFORM_ID]: 500,
};

export function getCharLimit(platformId: string): number | undefined {
  return PLATFORM_CHAR_LIMITS[platformId];
}
