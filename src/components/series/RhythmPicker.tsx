import { useTranslation } from 'react-i18next'
import { TextSelect } from '@/components/ui/text-select'
import { rhythmLine } from './format'
import type { SeriesRhythm } from './types'

/**
 * How often a series runs, as one control (CON-264).
 *
 * **Presets rather than a number field and a unit field.** Two inputs side by
 * side in every row of a list is a lot of furniture for an answer that is
 * "weekly" nine times out of ten, and it invites the typo the model's ceiling
 * exists to absorb. The presets cover what people actually pick.
 *
 * The model is still `{times, per}` and not an enum, because the *arithmetic*
 * has to take any number: a rhythm set through the API later, or by a build
 * that offers more presets than this one, must plan correctly here. Which is
 * why this picker does the thing every picker in this app has to do — **it
 * tolerates a current value that is not among its options**, by listing that
 * value as an extra one rather than showing a blank trigger or silently
 * snapping the series to the nearest preset it recognises.
 *
 * Occasional is an option and not a cleared field, for the same reason unset is
 * a listed option on the format picker: it is a real answer — *runs when there
 * is something for it* — and `null` is how `rhythmClaim` reads "claims no slots
 * in the plan".
 */
const OCCASIONAL = 'occasional'

const PRESETS: SeriesRhythm[] = [
  { times: 1, per: 'week' },
  { times: 2, per: 'week' },
  { times: 3, per: 'week' },
  { times: 1, per: 'month' },
  { times: 2, per: 'month' },
]

/** `2-week`. Parsed back in `fromKey`; never stored, never sent anywhere. */
function toKey(rhythm: SeriesRhythm | null): string {
  return rhythm && rhythm.times > 0
    ? `${rhythm.times}-${rhythm.per}`
    : OCCASIONAL
}

function fromKey(key: string): SeriesRhythm | null {
  if (key === OCCASIONAL) return null
  const [times, per] = key.split('-')
  const count = Number(times)
  if (!Number.isFinite(count) || count <= 0) return null
  return { times: count, per: per === 'week' ? 'week' : 'month' }
}

export function RhythmPicker({
  value,
  onChange,
  disabled,
  id,
  variant = 'primary',
  className,
}: {
  value: SeriesRhythm | null
  onChange: (rhythm: SeriesRhythm | null) => void
  disabled?: boolean
  id?: string
  variant?: 'default' | 'ghost' | 'primary' | 'inline'
  className?: string
}) {
  const { t } = useTranslation()
  const current = toKey(value)

  const options = PRESETS.map(toKey)
  // The one the series is actually on, if this build has no preset for it.
  // Appended rather than sorted into place: it is an exception, and the list
  // people scan every day should keep its familiar order.
  const extra =
    options.includes(current) || current === OCCASIONAL ? [] : [current]

  const elements = [
    { id: OCCASIONAL, displayValue: rhythmLine(t, null) },
    ...[...options, ...extra].map((key) => ({
      id: key,
      displayValue: rhythmLine(t, fromKey(key)),
    })),
  ]

  return (
    <TextSelect
      id={id}
      className={className}
      variant={variant}
      value={current}
      elements={elements}
      disabled={disabled}
      onValueChange={(next) => onChange(fromKey(next))}
    />
  )
}
