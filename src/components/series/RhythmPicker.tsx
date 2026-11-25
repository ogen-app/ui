import { useTranslation } from 'react-i18next'
import { TextSelect } from '@/components/ui/text-select'
import { counted } from '@/lib/intl'
import { takesWeekday } from '@/lib/seriesPlan'
import {
  MAX_RHYTHM_EVERY,
  SERIES_WEEKDAYS,
  type SeriesRhythm,
  type SeriesWeekday,
} from '@/types/series'
import { rhythmLine, weekdayName } from './format'

/**
 * How often a series runs, as one control (CON-264).
 *
 * **Presets rather than a number field and a unit field.** Two inputs side by
 * side in every row of a list is a lot of furniture for an answer that is
 * "weekly" nine times out of ten, and it invites the typo the model's ceiling
 * exists to absorb. The presets cover what people actually pick.
 *
 * Beside the rate, two smaller selects once there is one (CON-496): how often
 * it skips — every week, every 2 weeks — and, at once a week, which day it
 * lands on. They stay out of the way until they mean something, so the
 * ordinary answer is still one control.
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
  // The rate only: how often it skips and its day are the other two selects.
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
  size,
  className,
}: {
  value: SeriesRhythm | null
  onChange: (rhythm: SeriesRhythm | null) => void
  disabled?: boolean
  id?: string
  variant?: 'default' | 'ghost' | 'primary' | 'inline' | 'button'
  /** The trigger's height — `sm` for the button variant on a card or a dialog. */
  size?: 'default' | 'sm' | 'lg'
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

  // A new rate keeps how often it skips, and its day only while it is still
  // once a week — the one rate a day can go with.
  const changeRate = (next: SeriesRhythm | null) => {
    if (!next || !value) return onChange(next)
    const kept: SeriesRhythm = { ...next }
    if (value.every && value.per === next.per) kept.every = value.every
    if (value.weekday && takesWeekday(next)) kept.weekday = value.weekday
    onChange(kept)
  }

  const every = value?.every && value.every > 1 ? value.every : 1
  const everyKey =
    value?.per === 'month' ? 'everyMonthOption' : 'everyWeekOption'

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <TextSelect
        id={id}
        className={className}
        variant={variant}
        size={size}
        value={current}
        elements={elements}
        disabled={disabled}
        onValueChange={(next) => changeRate(fromKey(next))}
      />
      {value && (
        <TextSelect
          className={className}
          variant={variant}
          size={size}
          ariaLabel={t('series.rhythm.everyLabel')}
          value={String(every)}
          elements={EVERY.map((n) => ({
            id: String(n),
            displayValue: t(`series.rhythm.${everyKey}`, counted(n)),
          }))}
          disabled={disabled}
          onValueChange={(next) => {
            const n = Number(next)
            const { every: _every, ...rest } = value
            onChange(n > 1 ? { ...rest, every: n } : rest)
          }}
        />
      )}
      {value && takesWeekday(value) && (
        <TextSelect
          className={className}
          variant={variant}
          size={size}
          ariaLabel={t('series.rhythm.dayLabel')}
          value={value.weekday ?? ANY_DAY}
          elements={[
            { id: ANY_DAY, displayValue: t('series.rhythm.anyDay') },
            ...SERIES_WEEKDAYS.map((day) => ({
              id: day,
              displayValue: t('series.rhythm.onDay', {
                day: weekdayName(day),
              }),
            })),
          ]}
          disabled={disabled}
          onValueChange={(next) => {
            const { weekday: _weekday, ...rest } = value
            onChange(
              next === ANY_DAY
                ? rest
                : { ...rest, weekday: next as SeriesWeekday },
            )
          }}
        />
      )}
    </span>
  )
}

/** Every period, up to once in twelve — the server's ceiling. */
const EVERY = Array.from({ length: MAX_RHYTHM_EVERY }, (_, i) => i + 1)

/** No day: the period's posts spread over it. */
const ANY_DAY = 'any'
