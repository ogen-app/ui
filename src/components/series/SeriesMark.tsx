import { RepeatIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useFeatureFlag } from '@/config/featureFlags'
import { useSeriesLibrary } from '@/hooks/useSeries'
import { cn } from '@/lib/styles'

/**
 * The series an idea or a post was made for (CON-496): the section's repeat
 * mark and the series' name, looked up in the workspace's library — the rows
 * carry only the id. Nothing while the library loads, and nothing for a
 * series since deleted, whose posts keep the id — and nothing, asking for
 * nothing, while the `series` flag is off.
 */
export function SeriesMark({
  seriesId,
  className,
}: {
  seriesId: string | null | undefined
  className?: string
}) {
  const { t } = useTranslation()
  const on = useFeatureFlag('series')
  const { data: library } = useSeriesLibrary({
    enabled: on && Boolean(seriesId),
  })
  const series = seriesId ? library?.find((s) => s.id === seriesId) : undefined
  if (!on || !series) return null
  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-1', className)}
      title={t('series.mark', { name: series.name })}
    >
      <RepeatIcon aria-hidden className="size-3.5 shrink-0" />
      <span className="truncate">{series.name}</span>
    </span>
  )
}
