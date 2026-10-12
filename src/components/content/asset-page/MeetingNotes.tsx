import { useTranslation } from 'react-i18next'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { Section } from './InsightSection'
import { SourceChip } from './SourceChip'

/**
 * What a meeting recording settled (CON-364): who was there, who promised
 * what by when, what was decided and what was left open.
 *
 * Participants and owners are the model's reading of a transcript with no
 * speaker diarisation, so an inferred one says "inferred" rather than being
 * passed off as a fact. A commitment carries the moment it was said; its chip
 * plays the recording from there.
 */
export function MeetingNotes({ lens }: { lens: AssetAnalysis }) {
  const { t } = useTranslation()
  const participants = lens.participants ?? []
  const commitments = lens.commitments ?? []
  const decisions = lens.decisions ?? []
  const questions = lens.open_questions ?? []

  return (
    <>
      {participants.length > 0 && (
        <Section title={t('assetInsights.meeting.participants')}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {participants.map((p) => (
              <li key={p.name} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tertiary text-sm font-medium text-secondary-foreground"
                >
                  {p.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {p.name}
                  </span>
                  <span className="truncate text-xs text-tertiary-foreground">
                    {[
                      p.role,
                      p.confidence === 'inferred'
                        ? t('assetInsights.meeting.inferred')
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {commitments.length > 0 && (
        <Section
          title={t('assetInsights.meeting.commitments', {
            count: commitments.length,
          })}
        >
          <ul className="flex flex-col border-t border-quaternary">
            {commitments.map((c, i) => (
              <li
                key={i}
                className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-x-4 gap-y-1 border-b border-quaternary py-3 text-sm sm:grid-cols-[minmax(0,140px)_1fr_120px_auto]"
              >
                <span
                  className={
                    c.owner
                      ? 'truncate font-medium text-foreground'
                      : 'truncate text-tertiary-foreground'
                  }
                >
                  {c.owner || t('assetInsights.meeting.unattributed')}
                </span>
                <span className="text-foreground">{c.commitment}</span>
                <span className="hidden text-tertiary-foreground sm:block">
                  {c.due || '—'}
                </span>
                <span className="justify-self-end">
                  {c.source_label && <SourceChip label={c.source_label} />}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(decisions.length > 0 || questions.length > 0) && (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {decisions.length > 0 && (
            <Section title={t('assetInsights.meeting.decisions')}>
              <Bullets items={decisions.map((d) => d.text)} />
            </Section>
          )}
          {questions.length > 0 && (
            <Section title={t('assetInsights.meeting.openQuestions')}>
              <Bullets items={questions} />
            </Section>
          )}
        </div>
      )}
    </>
  )
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-foreground marker:text-tertiary-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
