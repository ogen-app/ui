import { z } from 'zod'

/**
 * A search param that is text, read leniently.
 *
 * TanStack Router parses the query JSON-first, so `?workspace=123` arrives as
 * the *number* 123 — and a plain `z.string()` would fail the whole route's
 * validation over it. An id or a slug that happens to be all digits is still
 * that id, so a number is turned back into its text; anything else that is not
 * a string is dropped rather than failing the page.
 */
export const searchText = z
  .preprocess(
    (value) => (typeof value === 'number' ? String(value) : value),
    z.string().optional(),
  )
  .catch(undefined)

/** The same reading, for a search value that never went through a schema. */
export function searchTextOf(value: unknown): string | undefined {
  return searchText.parse(value)
}
