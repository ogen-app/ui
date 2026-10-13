import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'
import { summaryParts } from '@/lib/assetAnalysis'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { Section } from './InsightSection'
import { Bullets } from './MeetingNotes'
import { SummaryLead, SummaryText } from './SummaryText'

/** Past this many characters a lead paragraph runs past four lines. */
const LEAD_FITS = 320

/**
 * The reading, at rest and in full (CON-369).
 *
 * At rest it is the summary's opening paragraph, four lines at most, and a
 * way to read the rest: the ideas are what someone opened the page for, and
 * they come next. In full it is the whole summary and the key points, and it
 * grows the page itself — there is no box scrolling inside a scrolling page
 * for the wheel to get caught in. Prose stays near 68 characters a line.
 */
export function ReadingSummary({
  lens,
}: {
  lens: Pick<
    AssetAnalysis,
    'summary' | 'key_points' | 'partial_source' | 'truncated'
  >
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const regionId = useId()
  const hasSummary = lens.summary.trim() !== ''

  // Whether "read the full summary" would show anything more: another block,
  // a heading, the key points, or a lead too long for four lines.
  const parts = summaryParts(lens.summary)
  const more =
    lens.key_points.length > 0 ||
    parts.length > 1 ||
    (parts[0]?.kind === 'text' &&
      (parts[0].text.includes('\n') || parts[0].text.length > LEAD_FITS))

  const note = (lens.partial_source || lens.truncated) && (
    <p className="text-xs text-warning">
      {lens.partial_source
        ? t('assetInsights.partialSource')
        : t('assetInsights.truncated')}
    </p>
  )

  if (!hasSummary) {
    return lens.key_points.length > 0 ? (
      <Section title={t('assetInsights.keyPoints')}>
        <Bullets items={lens.key_points} />
      </Section>
    ) : null
  }

  return (
    <Section title={t('assetInsights.summary')}>
      <div id={regionId} className="flex max-w-[68ch] flex-col gap-6">
        {open ? (
          <>
            <SummaryText text={lens.summary} />
            {note}
            {lens.key_points.length > 0 && (
              <Section title={t('assetInsights.keyPoints')}>
                <Bullets items={lens.key_points} />
              </Section>
            )}
          </>
        ) : (
          <>
            <p className="line-clamp-4 text-[15px] leading-7 text-foreground">
              <SummaryLead text={lens.summary} />
            </p>
            {note}
          </>
        )}
      </div>
      {more && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((v) => !v)}
          className="flex cursor-pointer items-center gap-1.5 self-start text-sm font-medium text-accent hover:underline"
        >
          {open
            ? t('assetInsights.summaryLess')
            : t('assetInsights.summaryMore')}
          {open ? (
            <CaretUpIcon className="size-3.5" aria-hidden />
          ) : (
            <CaretDownIcon className="size-3.5" aria-hidden />
          )}
        </button>
      )}
    </Section>
  )
}
