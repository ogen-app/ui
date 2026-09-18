/**
 * A query, as the three things a screen has to be able to draw — **including
 * the third one, which is the point of the type.**
 *
 * It exists because of what a screen fed by *two* queries does with a boolean
 * pair. Foundation's hub reads `useBrand` for its five written sections and
 * `useAssets` for Sources, and it decided what to render with
 * `data && assets ? { isPending: false, data } : { isPending: true }` — which
 * made the slower of the two the speed of the whole screen, and a *failed* one
 * the end of it. With `/api/assets` answering anything but a list, five cards'
 * worth of material that had already arrived sat unread behind placeholder
 * blocks that pulsed for ever, because "not here yet" and "not coming" were
 * the same state and only one of them was ever going to change.
 *
 * So: three cases, one per query, handed to whichever part of the screen that
 * query actually feeds. The parts fed by the same query still land together —
 * that is a fact about the fetch and not something a screen should paper over.
 */
export type Fetched<T> =
  { status: 'pending' } | { status: 'error' } | { status: 'ready'; data: T }

/**
 * A react-query result as one of those three.
 *
 * Takes the two fields it reads rather than `UseQueryResult`, so the modules
 * that render from this — and the fixtures that stand in for a query — do not
 * have to import react-query to describe their own props.
 *
 * **Data present wins over `isError`**, which is the case the boolean pair
 * gets wrong in the other direction: a *refetch* that fails leaves the last
 * good answer in the cache with the error flag raised beside it, and a screen
 * is better off showing what we last knew than replacing it with an apology
 * for a request the user never asked for. `isPending` is not read for the same
 * reason — it is false during that failed refetch, and what the screen wants
 * to know is whether it has anything to draw.
 */
export function fetched<T>(query: { data?: T; isError: boolean }): Fetched<T> {
  if (query.data !== undefined) return { status: 'ready', data: query.data }
  return { status: query.isError ? 'error' : 'pending' }
}
