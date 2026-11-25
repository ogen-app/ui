import { Segmented } from '@/components/ui/segmented'
import { TextSelect } from '@/components/ui/text-select'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { measureCopy } from './format'
import {
  MEASURE_IDS,
  SLEEVE_DIMENSION_IDS,
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
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center gap-x-3 gap-y-2',
        className,
      )}
    >
      <Segmented
        size="sm"
        value={axis}
        onChange={onAxisChange}
        options={[
          { value: 'time', label: t('analytics.scopeBar.axisTime') },
          { value: 'sleeve', label: t('analytics.scopeBar.axisSleeve') },
        ]}
      />

      <div className="flex-1" />

      {axis === 'sleeve' && (
        <>
          <Picker
            label={t('analytics.scopeBar.compare')}
            value={t(`analytics.sleeves.${dimension}` as const)}
            options={SLEEVE_DIMENSION_IDS.map((id) => ({
              value: id,
              label: t(`analytics.sleeves.${id}` as const),
            }))}
            onChange={(v) => onDimensionChange(v as SleeveDimension)}
          />
          <Picker
            label={t('analytics.scopeBar.by')}
            value={measureCopy(t, measure).label}
            options={MEASURE_IDS.map((id) => ({
              value: id,
              label: measureCopy(t, id).label,
            }))}
            onChange={(v) => onMeasureChange(v as MeasureId)}
          />
        </>
      )}

      <Picker
        label={t('analytics.scopeBar.period')}
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
  highlighted = false,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  /** Tinted while it shows a value the assistant just set (CON-479). */
  highlighted?: boolean
}) {
  return (
    <TextSelect
      variant="button"
      size="sm"
      lead={label}
      ariaLabel={label}
      value={options.find((o) => o.label === value)?.value ?? ''}
      placeholder={value}
      onValueChange={onChange}
      elements={options.map((o) => ({ id: o.value, displayValue: o.label }))}
      className={cn('shrink-0', highlighted && 'border-accent bg-accent/5')}
    />
  )
}
