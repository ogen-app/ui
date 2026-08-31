import { CaretDownIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import {
  MEASURES,
  SLEEVE_DIMENSIONS,
  type MeasureId,
  type Period,
  type SleeveDimension,
} from './types'

/**
 * The primitive, made visible.
 *
 * Everything on these surfaces is one comparison: a **measure**, over a
 * **sleeve**, against an **axis**. The axis is the only genuinely new control
 * — it decides whether we hold this sleeve against its own past ("what
 * happened, and is it unusual?") or against a sibling sleeve ("where does the
 * next hour go?"). Those are the two questions people actually bring, and
 * splitting them into separate pages was a mistake: same data, same controls,
 * one switch.
 *
 * The period lens sits here too, and it deliberately looks like it belongs to
 * the comparison rather than to the page — because it does. Sections below
 * that don't obey it say so on themselves.
 */
export type ComparisonAxis = 'time' | 'sleeve'

export function ComparisonBar({
  axis,
  onAxisChange,
  period,
  periods,
  onPeriodChange,
  dimension,
  onDimensionChange,
  measure,
  onMeasureChange,
  className,
}: {
  axis: ComparisonAxis
  onAxisChange: (axis: ComparisonAxis) => void
  period: Period
  periods: Period[]
  onPeriodChange: (period: Period) => void
  dimension: SleeveDimension
  onDimensionChange: (dimension: SleeveDimension) => void
  measure: MeasureId
  onMeasureChange: (measure: MeasureId) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex w-full max-w-content mx-auto flex-wrap items-center gap-x-3 gap-y-2',
        className,
      )}
    >
      <Segmented
        value={axis}
        onChange={onAxisChange}
        options={[
          { value: 'time', label: 'Now vs. before' },
          { value: 'sleeve', label: 'Side by side' },
        ]}
      />

      <div className="flex-1" />

      {axis === 'sleeve' && (
        <>
          <Picker
            label="Compare"
            value={SLEEVE_DIMENSIONS[dimension]}
            options={Object.entries(SLEEVE_DIMENSIONS).map(([id, label]) => ({
              value: id,
              label,
            }))}
            onChange={(v) => onDimensionChange(v as SleeveDimension)}
          />
          <Picker
            label="By"
            value={MEASURES[measure].label}
            options={Object.values(MEASURES).map((m) => ({
              value: m.id,
              label: m.label,
            }))}
            onChange={(v) => onMeasureChange(v as MeasureId)}
          />
        </>
      )}

      <Picker
        label="Period"
        value={period.label}
        options={periods.map((p) => ({ value: p.label, label: p.label }))}
        onChange={(v) => {
          const next = periods.find((p) => p.label === v)
          if (next) onPeriodChange(next)
        }}
      />
    </div>
  )
}

/*
 * There is no `PeriodBar` any more. The campaign surface ships with one axis —
 * this sleeve against its own past — so the axis switch had nothing to switch
 * to, and what was left was a row holding a single picker. That picker now
 * rides in the platform bar, where the rest of the scope already lived. When
 * "Side by side" comes into scope the switch comes back and {@link
 * ComparisonBar} is what it comes back into.
 */

/**
 * A one-of-N switch, for a choice small enough that every option can be on
 * screen at once. Exported because a card can own one — the post card decides
 * whether its charts show a running total or what arrived in each bucket — and
 * a mode switch inside a card should be the same control as a mode switch above
 * the page.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-md bg-quaternary p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'rounded-[5px] px-3 py-1.5 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-secondary-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * A native select wearing the app's clothes. A real implementation would reach
 * for `ui/select`; here the point is the shape of the control, not the menu.
 *
 * Exported because a card can own a picker of its own — the performers card
 * chooses what "best" means — and two controls that decide what a list shows
 * should not look like two different kinds of control.
 */
export function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-md border border-border bg-primary px-2.5 py-1.5">
      <span className="text-xs text-tertiary-foreground">{label}</span>
      <span className="relative inline-flex items-center gap-1">
        <select
          value={
            options.find((o) => o.label === value)?.value ?? options[0]?.value
          }
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-transparent pr-4 text-xs font-medium text-foreground outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <CaretDownIcon
          className="pointer-events-none absolute right-0 size-3 text-tertiary-foreground"
          aria-hidden
        />
      </span>
    </label>
  )
}
