import { ApiError } from '@/services/api/errors'

/**
 * What to show when submitting a page fails (CON-222).
 *
 * One case needs translating and the rest don't. A 409 is the *deployment*
 * saying it has no scraping key — the API phrases it for an API client ("url
 * scraping is not configured"), and it is not about the link, not about this
 * workspace's data, and not something the user can fix by editing anything.
 * Every other refusal already arrives written for a person: an invalid URL, a
 * blocked host, a server that fell over.
 */
export function readPageErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 409) {
    return "Reading web pages isn't switched on for this workspace yet."
  }
  return err instanceof Error ? err.message : 'Unable to read that page'
}
