import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import {
  Bar,
  BandBar,
  NeedsPreview,
  PlatformMark,
  ProgressHeader,
} from '@/components/campaigns/overview/CampaignOverview.tsx'
import { needsLines } from '@/components/campaigns/overview/needsLines'
import { useCampaignSummaries } from '@/hooks/useCampaigns.ts'
import { usePlatformViews } from '@/hooks/usePlatforms.ts'
import { campaignTypeInfo } from '@/lib/campaignTypeDictionary.ts'
import { attentionItems } from '@/lib/campaignReadiness.ts'
import {
  RECENT_DAYS,
  overviewModel,
  overviewPlatforms,
  type OverviewBand,
  type OverviewModel,
  type OverviewPlatform,
} from '@/lib/campaignOverview'
import { counted, formatNumber } from '@/lib/intl'
import { cn } from '@/lib'
import type { Campaign } from '@/types/campaigns.ts'

/**
 * One campaign on the Campaigns list, as the campaign's Overview in one row:
 * what it is, where it is in its own time, and what wants the user — three
 * columns, so a wide page is used across rather than stretched.
 *
 * Every figure and every warning is `overviewModel`'s, run over the
 * workspace's post summaries — one query for the whole list, never one per
 * card (CON-152) — so the row and the Overview behind it can't disagree. Two
 * things the Overview has that the row can't without a read per campaign:
 * today's phase (the phase windows are `GET …/phases`) and the server's
 * calendar problems. The row shows the client's rules alone, and no phase.
 */
export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation()
  const summariesQuery = useCampaignSummaries()
  const platformViews = usePlatformViews()

  // Load state comes from the query, never from this campaign's entry: the
  // server omits campaigns with no posts, so an absent id means "none". A
  // failed read is not an empty campaign either, so it scores nothing.
  const posts = summariesQuery.isSuccess
    ? (summariesQuery.data?.[campaign.id] ?? [])
    : null
  const now = new Date()
  const model = overviewModel({
    campaign,
    posts,
    platformViews,
    phases: null,
    attention: posts ? attentionItems(campaign, posts, platformViews, now) : [],
    problems: null,
    total: null,
    now,
  })

  return (
    // The whole row is the link, named for what it opens rather than read out
    // as every figure and warning in one breath.
    <Link
      to="/campaigns/$campaignId/overview"
      params={{ campaignId: campaign.id }}
      aria-label={t('campaigns.list.open', {
        name: campaign.name.trim() || t('nav.untitledCampaign'),
      })}
      className="block min-w-0"
    >
      <CampaignRow
        campaign={campaign}
        model={model}
        platforms={overviewPlatforms(campaign, platformViews)}
        loading={posts === null && !summariesQuery.isError}
        failed={summariesQuery.isError}
      />
    </Link>
  )
}

/**
 * The row itself, from a model — split from the reads so the design harness
 * can draw every stage from fixtures. It sits inside the link the list wraps
 * it in, so nothing in it is a link or a button.
 *
 * Every column is a head and two lines of body text: the type and the
 * channels; the bar and what it counts; the first two things that want the
 * user. Keeping the three to the same rhythm is what keeps the row short and
 * free of holes, so a stage with nothing to count still draws its grey bar
 * and says so in words.
 */
export function CampaignRow({
  campaign,
  model,
  platforms,
  loading = false,
  failed = false,
}: {
  campaign: Campaign
  model: OverviewModel
  platforms: OverviewPlatform[]
  /** The posts are still on their way: the figures wait for them. */
  loading?: boolean
  /** The posts couldn't be read: say so rather than score an empty list. */
  failed?: boolean
}) {
  const { t } = useTranslation()
  const title = campaign.name.trim() || t('nav.untitledCampaign')
  const typeName = campaign.campaign_type?.name
  const typeLabel = typeName ? campaignTypeInfo(typeName).label : null
  // A campaign with no dates has steps rather than warnings: what is left of
  // its setup is what wants the user.
  const needs =
    model.stage === 'new'
      ? {
          title: t('campaigns.list.setUp'),
          lines: (model.setup ?? [])
            .filter((s) => !s.done)
            .map((s) => ({
              id: s.id,
              mark: 'todo' as const,
              label: t(`campaignOverview.setup.${s.id}.title`),
            })),
        }
      : {
          title: t(`campaignOverview.needs.${model.needsTitle}`),
          lines:
            loading || model.needs === null ? null : needsLines(t, model.needs),
        }
  const results = model.results

  // Each column is a head and a body. From 40rem the columns are subgrids of
  // the row's two lines, so their heads share one baseline whatever their
  // size, and the bodies start level under them.
  const column = '@min-[40rem]:grid-rows-subgrid grid content-start gap-y-2'

  return (
    // The columns answer to the row's own width: three across on a wide page;
    // narrower, the name over the other two; narrowest, one under another.
    <div className="@container rounded-md border border-border bg-primary px-5 py-4 transition-shadow duration-150 hover:shadow-lg">
      <div
        className={cn(
          'grid gap-y-4',
          '@min-[40rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] @min-[40rem]:grid-rows-[auto_auto_auto]',
          '@min-[64rem]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] @min-[64rem]:grid-rows-[auto_auto]',
        )}
      >
        {/* What it is: its name, its type, and the channels it posts to —
            one line across the top of a narrower row, a column of its own on
            a wide one. */}
        <div
          className={cn(
            'grid content-start gap-y-2',
            '@min-[40rem]:flex @min-[40rem]:items-baseline @min-[40rem]:gap-x-3 @min-[40rem]:[grid-area:1/1/2/-1]',
            '@min-[64rem]:grid @min-[64rem]:grid-rows-subgrid @min-[64rem]:[grid-area:1/1/span_2/2] @min-[64rem]:pr-6',
          )}
        >
          <h3 className="min-w-0 self-baseline truncate font-display text-xl font-medium tracking-tight">
            {title}
          </h3>
          <div
            className={cn(
              'flex min-w-0 flex-col items-start gap-1.5 text-sm/5',
              '@min-[40rem]:flex-1 @min-[40rem]:flex-row @min-[40rem]:items-baseline @min-[40rem]:justify-between @min-[40rem]:gap-3',
              '@min-[64rem]:flex-none @min-[64rem]:flex-col @min-[64rem]:items-start @min-[64rem]:gap-1.5',
            )}
          >
            {typeLabel && <p className="truncate">{typeLabel}</p>}
            {platforms.length > 0 ? (
              <span className="flex h-5 flex-wrap items-center gap-2 self-start @min-[40rem]:self-center @min-[64rem]:self-start">
                {platforms.map((p) => (
                  <PlatformMark key={p.id} platform={p} className="size-5" />
                ))}
              </span>
            ) : (
              <span>{t('campaigns.list.noChannels')}</span>
            )}
          </div>
        </div>

        {/* Where it is in its own time: the Overview's progress card. */}
        <div
          className={cn(
            column,
            '@min-[40rem]:[grid-area:2/1/span_2/2] @min-[40rem]:pr-6',
            '@min-[64rem]:[grid-area:1/2/span_2/3] @min-[64rem]:border-l @min-[64rem]:border-border @min-[64rem]:pl-6',
          )}
        >
          <div className="self-baseline">
            <ProgressHeader stage={model.stage} band={model.band} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 text-sm/5">
            <div className="flex h-5 items-center">
              {!failed && !loading && results ? (
                <Bar
                  track={
                    results.goal ??
                    results.published + results.failed + results.neverPublished
                  }
                  parts={[
                    { value: results.published, className: 'bg-positive' },
                    { value: results.failed, className: 'bg-destructive' },
                  ]}
                />
              ) : !failed && !loading && model.band ? (
                <BandBar band={model.band} />
              ) : (
                <Bar track={0} parts={[]} />
              )}
            </div>
            {failed ? (
              <p className="truncate" title={t('campaigns.list.loadFailed')}>
                {t('campaigns.list.loadFailed')}
              </p>
            ) : loading ? (
              <Skeleton className="h-5 w-2/3" />
            ) : model.stage === 'new' ? (
              <p>{t('campaigns.list.notDated')}</p>
            ) : results ? (
              <ResultsLine results={results} />
            ) : model.band ? (
              <PostsLine band={model.band} />
            ) : null}
          </div>
        </div>

        {/* What wants the user: the Overview's list, short. */}
        <div
          className={cn(
            column,
            '[&>:first-child]:self-baseline',
            '@min-[40rem]:[grid-area:2/2/span_2/3] @min-[40rem]:border-l @min-[40rem]:border-border @min-[40rem]:pl-6',
            '@min-[64rem]:[grid-area:1/3/span_2/4]',
          )}
        >
          {!failed && <NeedsPreview title={needs.title} lines={needs.lines} />}
        </div>
      </div>
    </div>
  )
}

type Phrase = { key: string; text: string; dot?: string; alert?: boolean }

/** Figures as a line of short sentences, a dot where the bar has a colour. */
function Phrases({ phrases }: { phrases: Phrase[] }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1.5">
      {phrases.map((p) => (
        <span
          key={p.key}
          className={cn(
            'inline-flex items-center gap-1.5',
            p.alert && 'text-destructive',
          )}
        >
          {p.dot && (
            <span
              className={cn('size-2 shrink-0 rounded-full', p.dot)}
              aria-hidden
            />
          )}
          {p.text}
        </span>
      ))}
    </p>
  )
}

/**
 * What the bar counts, in words: the published and the scheduled — the 30
 * days either side of today, or the whole campaign against its goal — and the
 * pace. The Overview's `PostsBar` figures, as a sentence a row can hold.
 */
function PostsLine({ band }: { band: OverviewBand }) {
  const { t } = useTranslation()
  const { goal, pace } = band
  const { published, scheduled } = goal != null ? band : band.recent
  const days = formatNumber(RECENT_DAYS)
  const phrases: Phrase[] = [
    // Before the start nothing can be out; with a goal, the count still reads.
    ...(published > 0 || goal != null || band.startsIn == null
      ? [
          {
            key: 'published',
            dot: 'bg-positive',
            text:
              goal != null
                ? t('campaigns.list.line.publishedOf', {
                    ...counted(published),
                    goal: formatNumber(goal),
                  })
                : t('campaigns.list.line.published', {
                    ...counted(published),
                    days,
                  }),
          },
        ]
      : []),
    ...(scheduled > 0
      ? [
          {
            key: 'scheduled',
            dot: 'bg-positive/35',
            text:
              goal != null
                ? t('campaigns.list.line.scheduled', counted(scheduled))
                : t('campaigns.list.line.scheduledNext', {
                    ...counted(scheduled),
                    days,
                  }),
          },
        ]
      : []),
    ...(pace
      ? [
          {
            key: 'pace',
            text: t(
              pace.planned
                ? 'campaigns.list.line.pacePlanned'
                : 'campaigns.list.line.pace',
              {
                count: Math.round(pace.perWeek * 10) / 10,
                formatted: formatNumber(pace.perWeek, {
                  maximumFractionDigits: 1,
                }),
              },
            ),
          },
        ]
      : []),
  ]
  if (published === 0 && scheduled === 0 && !pace && goal == null)
    return <p>{t('campaigns.list.line.nothingYet')}</p>
  return <Phrases phrases={phrases} />
}

/** What an ended campaign came to, in words; a zero is left unsaid. */
function ResultsLine({
  results,
}: {
  results: NonNullable<OverviewModel['results']>
}) {
  const { t } = useTranslation()
  const big = (n: number) =>
    formatNumber(n, { notation: n >= 10_000 ? 'compact' : 'standard' })
  const phrases: Phrase[] = [
    {
      key: 'published',
      dot: 'bg-positive',
      text:
        results.goal != null
          ? t('campaigns.list.line.publishedOf', {
              ...counted(results.published),
              goal: formatNumber(results.goal),
            })
          : t('campaigns.list.line.publishedTotal', counted(results.published)),
    },
    ...(results.failed > 0
      ? [
          {
            key: 'failed',
            dot: 'bg-destructive',
            alert: true,
            text: t('campaigns.list.line.failed', counted(results.failed)),
          },
        ]
      : []),
    ...(results.neverPublished > 0
      ? [
          {
            key: 'never',
            text: t(
              'campaigns.list.line.neverPublished',
              counted(results.neverPublished),
            ),
          },
        ]
      : []),
    ...(results.performance
      ? [
          {
            key: 'reach',
            text: t('campaigns.list.line.reach', {
              formatted: big(results.performance.reach),
            }),
          },
          {
            key: 'interactions',
            text: t('campaigns.list.line.interactions', {
              count: results.performance.interactions,
              formatted: big(results.performance.interactions),
            }),
          },
        ]
      : []),
  ]
  return <Phrases phrases={phrases} />
}
