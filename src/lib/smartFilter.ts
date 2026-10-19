import type { IconSvgElement } from '@hugeicons/react'

/**
 * The filter sentence's contract with a list (CON-391, carried to Assets by
 * CON-392): what a list must say for `FilterSentence` to read and edit its
 * filter. The sentence knows clauses, panels and keys; the list knows its
 * fields, its values, how each clause is worded and the shape its filter
 * travels in. Assets (`lib/assetFilter`) and Ideas (`lib/ideaFilter`) are the
 * two that do.
 */

/**
 * What a field's value step is.
 *
 * - `choice`: values from a list, several at once ("that are PDFs or web pages").
 * - `substrings`: typed text, comma-separated, any of them ("with “q4” in the title").
 * - `search`: one typed phrase, no operator ("mentioning “wax”").
 * - `date`: presets, or a custom range or day.
 */
export type FieldKind = 'choice' | 'substrings' | 'search' | 'date'

/**
 * One token of the filter: a field, whether it is left out, and the values —
 * the shape the sentence reads and writes, whatever the list stores
 * underneath. A custom date range is one token holding two `YYYY-MM-DD`
 * bounds, the upper exclusive.
 */
export type SmartToken<Field extends string = string> = {
  field: Field
  /** Left out: "outside", "not tagged", "before". */
  negated: boolean
  values: string[]
}

/** How a list's filter is read and changed as tokens. */
export type FilterModel<F, Field extends string> = {
  kindOf: (field: Field) => FieldKind
  /** The tokens a filter holds, in field order. */
  tokensOf: (filter: F) => SmartToken<Field>[]
  /** The filter with this field and operator set to the token's values. */
  withToken: (filter: F, token: SmartToken<Field>) => F
  /** The filter without the token's field and operator. */
  withoutToken: (filter: F, token: SmartToken<Field>) => F
  /**
   * The text fields typing offers, in order — at most two: a search inside
   * and, for Assets, a title.
   */
  freeText: readonly Field[]
  /** The shortest `search` the server takes, and the longest typed text. */
  searchMin: number
  textMax: number
}

/**
 * How many rows a filter would leave — the counts beside typed text and in
 * the empty state. A query the caller runs, so a list says what to ask and
 * nothing about caching.
 */
export type CountQuery<F> = (filter: F) => {
  queryKey: readonly unknown[]
  queryFn: () => Promise<number>
}

/** One value a field offers. */
export type ValueOption = {
  value: string
  label: string
  /** How many rows choosing it would leave; null when that isn't known. */
  count: number | null
  icon?: IconSvgElement
  /** The icon's ink: verdicts in the pill's colours, a kind in its own. */
  tone?: 'accent' | 'positive' | 'muted' | string
  /** Sits under a rule after the ordinary values: "No tags", "Not read yet". */
  pinned?: boolean
  /** Shown but not choosable — a value the server cannot be asked for. */
  disabled?: boolean
}

/** A clause's catalogue key and what fills it. */
export type Clause = {
  key: string
  values: Record<string, string>
}

/**
 * The words of a list's filter sentence: how each clause reads, in which
 * order, and what its panel and the starters say.
 *
 * **One catalogue sentence per field and operator**, its chosen words marked
 * `<v>`, so a language orders the words its own way; the clauses are joined
 * by `Intl.ListFormat`. Never a clause assembled from fragments.
 */
export type SentenceVocabulary<Field extends string> = {
  /** The fields this page filters by — a campaign's page has no Campaign. */
  fields: readonly Field[]
  /** The order the clauses read in, however the filter was built. */
  order: readonly Field[]
  /**
   * A field whose included values name what is listed — "Showing *PDFs*, in
   * …" rather than "Showing assets that are PDFs". Read first when present.
   */
  subject?: Field
  /** The lead sentence; `<clauses>` holds the joined clauses. */
  showingKey: string
  /** The lead when the subject is the first clause. */
  showingSubjectKey?: string
  /** Nothing chosen: "Showing <v>all ideas</v>". */
  showingAllKey: string
  clause: (token: SmartToken<Field>) => Clause
  /** The clause as plain words, for screen readers and the empty state. */
  tokenText: (token: SmartToken<Field>) => string
  /** The values a `choice` or `date` field offers; `[]` for any other. */
  options: (field: Field, negated: boolean) => ValueOption[]
  /** A clause panel's question: "Ideas filed under…". */
  question: (field: Field) => string
  /** The two-word switch — kept, left out — or null when a field has none. */
  switchLabels: (field: Field) => [string, string] | null
  /** A long list's find field, or null. */
  findLabel: (field: Field) => string | null
  /** How a detail starts in the add list: "in a campaign…". */
  starter: (field: Field) => string
  starterHint: (field: Field) => string | null
  /** The prompt in a text clause's panel. */
  textPlaceholder: (field: Field) => string
  /** "3 ideas", "4 assets" — beside a typed search. */
  matches: (count: number) => string
}
