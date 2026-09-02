import { useMemo, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { ModalContainer } from '@/components/ui/modal'
import { StatTile } from '@/components/campaigns/overview/StatTile'
import { useCampaigns, useCampaignSummaries } from '@/hooks/useCampaigns'
import { useActivityFeed } from '@/hooks/useActivity'
import { useDayLabel } from '@/hooks/useActivityLabels'
import { channelName } from '@/components/activity/ActivityFeed'
import { reportForDay, type CountsByKind } from '@/lib/activityFeed'

/**
 * One day, as a report — the entry the feed's report row opens (CON-225).
 *
 * Computed, never stored: it is a count over the workspace's posts, so it is
 * correct as of this second and any past day is available for as long as its
 * posts are. That also fixes what it can say — publishing and creation, the
 * only outcomes `PostSummary` carries. The assistant runs, uploads and
 * connection health that belong in a full picture of a day are waiting on
 * CON-224, which is why the coverage line at the bottom is not decoration.
 *
 * Route-backed (`/activity/$date`), so a day can be linked and sent to someone
 * — for a daily report that is most of the point, and a plain overlay
 * forecloses it.
 */
export function DailyReportModal({
  date,
  onClose,
}: {
  date: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const dayLabel = useDayLabel()
  const { data: summaries } = useCampaignSummaries()
  const { now } = useActivityFeed()
  const { data: campaigns } = useCampaigns()

  const report = useMemo(
    () => (summaries ? reportForDay(summaries, date, now) : null),
    [summaries, date, now],
  )

  const campaignName = useMemo(() => {
    const byId = new Map((campaigns ?? []).map((c) => [c.id, c.name.trim()]))
    return (id: string) => byId.get(id) || t('nav.untitledCampaign')
  }, [campaigns, t])

  return (
    <ModalContainer
      isOpen
      onClose={onClose}
      size="full"
      height="full"
      title={`${t('activity.entry.reportTitle')} — ${dayLabel(date, now)}`}
    >
      <div className="flex h-full flex-col gap-8 overflow-y-auto">
        {!report ? (
          <p className="text-sm text-tertiary-foreground">
            {t('activity.report.nothing')}
          </p>
        ) : (
          <>
            <CountTiles counts={report.counts} />

            {report.publishedByChannel.length > 0 && (
              <Section title={t('activity.report.byChannel')}>
                <ul className="flex flex-col">
                  {report.publishedByChannel.map((channel) => (
                    <Row
                      key={channel.platformId}
                      label={channelName(channel.platformId)}
                      value={`${channel.count}`}
                    />
                  ))}
                </ul>
              </Section>
            )}

            <Section title={t('activity.report.byCampaign')}>
              <ul className="flex flex-col">
                {report.campaigns.map((campaign) => (
                  <Row
                    key={campaign.campaignId}
                    label={campaignName(campaign.campaignId)}
                    detail={countSentences(campaign.counts, t)}
                  />
                ))}
              </ul>
            </Section>
          </>
        )}

        <p className="mt-auto pt-4 text-xs text-tertiary-foreground">
          {t('activity.report.coverage')}
        </p>
      </div>
    </ModalContainer>
  )
}

/**
 * Zeroes are kept rather than hidden: "0 failed" is the sentence most of these
 * reports exist to say, and a tile that disappears on a good day makes the
 * reader check whether it was measured at all.
 */
function CountTiles({ counts }: { counts: CountsByKind }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <StatTile
        value={counts.published}
        label={t('activity.report.label.published')}
      />
      <StatTile
        value={counts.failed}
        label={t('activity.report.label.failed')}
        tone={counts.failed > 0 ? 'alert' : 'default'}
      />
      <StatTile
        value={counts.not_published}
        label={t('activity.report.label.notPublished')}
        tone={counts.not_published > 0 ? 'alert' : 'default'}
      />
      <StatTile
        value={counts.created}
        label={t('activity.report.label.created')}
      />
    </div>
  )
}

/**
 * A campaign's day in words — each count a whole sentence from its own key, so
 * the plural agrees in every language; the separator joins statements rather
 * than building one out of fragments.
 */
function countSentences(counts: CountsByKind, t: TFunction): string {
  const parts = [
    counts.published > 0 &&
      t('activity.report.published', { count: counts.published }),
    counts.failed > 0 && t('activity.report.failed', { count: counts.failed }),
    counts.not_published > 0 &&
      t('activity.report.notPublished', { count: counts.not_published }),
    counts.created > 0 &&
      t('activity.report.created', { count: counts.created }),
  ].filter((part): part is string => typeof part === 'string')
  return parts.join(' · ')
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-xs/4 font-medium uppercase text-tertiary-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Row({
  label,
  value,
  detail,
}: {
  label: string
  value?: string
  detail?: string
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="min-w-0 flex-1 truncate text-sm text-primary-foreground">
        {label}
      </span>
      {detail && (
        <span className="text-xs text-tertiary-foreground">{detail}</span>
      )}
      {value && (
        <span className="font-mono text-sm text-primary-foreground">
          {value}
        </span>
      )}
    </li>
  )
}
