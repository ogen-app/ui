import type { IconSvgElement } from '@hugeicons/react'

/**
 * The smart filter's contract with a list (CON-371, carried to Ideas by
 * CON-388): what a list must say for `SmartFilterBar` to filter it. The bar
 * knows tokens, steps and keys; the list knows its fields, its values and the
 * shape its filter travels in. Assets (`lib/assetFilter`) and Ideas
 * (`lib/ideaFilter`) are the two that do.
 */

/**
 * What a field's value step is.
 *
 * - `choice`: values from a list, several at once ("Type is PDF or Web page").
 * - `substrings`: typed text, comma-separated, any of them ("Title contains").
 * - `search`: one typed phrase, no operator ("Text mentions").
 * - `date`: presets, or a custom range or day.
 */
export type FieldKind = 'choice' | 'substrings' | 'search' | 'date'

/**
 * One token in the bar: a field, an operator and the values — the shape the
 * bar reads and writes, whatever the list stores underneath. A custom date
 * range is one token holding two `YYYY-MM-DD` bounds, the upper exclusive.
 */
export type SmartToken<Field extends string = string> = {
  field: Field
  /** "is not", "doesn't contain", "has no", "before". */
  negated: boolean
  values: string[]
}

/** How a list's filter is read and changed as tokens. */
export type FilterModel<F, Field extends string> = {
  kindOf: (field: Field) => FieldKind
  /** The tokens a filter shows, in field order. */
  tokensOf: (filter: F) => SmartToken<Field>[]
  /** The filter with this field and operator set to the token's values. */
  withToken: (filter: F, token: SmartToken<Field>) => F
  /** The filter without the token's field and operator. */
  withoutToken: (filter: F, token: SmartToken<Field>) => F
  /** `tag:gar` → the Tag value step; null when the text is not a prefix. */
  parseFieldPrefix: (
    input: string,
  ) => { field: Field; negated: boolean; rest: string } | null
  /**
   * The text fields free typing offers, in order — at most two, the first a
   * `substrings` or `search` field.
   */
  freeText: readonly Field[]
  /** The shortest `search` the server takes, and the longest typed text. */
  searchMin: number
  textMax: number
}

/** One value the bar offers for a field. */
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

/** The words of a list's filter: what its fields are called and what they offer. */
export type SmartVocabulary<Field extends string> = {
  /** The bar's accessible name: "Filter the assets". */
  label: string
  /** The empty bar's prompt. */
  placeholder: string
  fields: readonly Field[]
  fieldLabel: (field: Field) => string
  fieldHint: (field: Field) => string
  operatorLabel: (field: Field, negated: boolean) => string
  hasOperatorStep: (field: Field) => boolean
  /** The prompt in a `substrings` or `search` field's value step. */
  textPlaceholder: (field: Field) => string
  /** A token's values as one phrase: "Gartner or Finance". */
  tokenValueText: (token: Pick<SmartToken<Field>, 'field' | 'values'>) => string
  /** The whole token as one sentence, for screen readers. */
  tokenText: (token: SmartToken<Field>) => string
  /** The values a `choice` or `date` field offers; `[]` for any other. */
  options: (field: Field, negated: boolean) => ValueOption[]
}

/** The values a field's token already holds, for reopening its value step. */
export function tokenValuesOf<F, Field extends string>(
  model: FilterModel<F, Field>,
  filter: F,
  field: Field,
  negated: boolean,
): string[] {
  return (
    model
      .tokensOf(filter)
      .find(
        (t) => t.field === field && t.negated === negated && t.values.length,
      )?.values ?? []
  )
}
