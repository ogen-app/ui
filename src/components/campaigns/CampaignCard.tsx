import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import {
  NeedsPreview,
  PlatformMark,
  PostsBar,
  ProgressHeader,
  ResultsFigures,
} from '@/components/campaigns/overview/CampaignOverview.tsx'
import { needsLines } from '@/components/campaigns/overview/needsLines'
import { useFeatureFlag } from '@/config/featureFlags'
import { placeLink, type PlaceId } from '@/lib/campaignScope'
import { useCampaignSummaries } from '@/hooks/useCampaigns.ts'
import { usePlatformViews } from '@/hooks/usePlatforms.ts'
import { campaignTypeInfo } from '@/lib/campaignTypeDictionary.ts'
import { attentionItems } from '@/lib/campaignReadiness.ts'
import {
  overviewModel,
  overviewPlatforms,
  type OverviewModel,
  type OverviewPlatform,
} from '@/lib/campaignOverview'
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
export function CampaignCard({
  campaign,
  place = 'overview',
}: {
  campaign: Campaign
  /** The section a click opens — the Overview unless the list is a picker. */
  place?: PlaceId
}) {
  const { t } = useTranslation()
  const workspaceCalendar = useFeatureFlag('workspace-calendar')
  const link = placeLink(place, campaign.id, { workspaceCalendar })
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
      to={link.to}
      params={link.params}
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

  // Each column is a head and a body. From 40rem the columns are subgrids of
  // the row's two lines, so their heads share one baseline whatever their
  // size, and the bodies start level under them.
  const column = '@min-[40rem]:grid-rows-subgrid grid content-start gap-3'

  return (
    // The columns answer to the row's own width: three across on a wide page;
    // narrower, the name over the other two; narrowest, one under another.
    <div className="@container rounded-md border border-border bg-primary p-5 transition-shadow duration-150 hover:shadow-lg">
      <div
        className={cn(
          'grid gap-y-5',
          '@min-[40rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] @min-[40rem]:grid-rows-[auto_auto_auto_1fr]',
          '@min-[64rem]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] @min-[64rem]:grid-rows-[auto_1fr]',
        )}
      >
        {/* What it is: its name, its type, and the channels it posts to. */}
        <div
          className={cn(
            column,
            '@min-[40rem]:[grid-area:1/1/span_2/-1]',
            '@min-[64rem]:[grid-area:1/1/span_2/2] @min-[64rem]:pr-6',
          )}
        >
          <h3 className="self-baseline truncate font-display text-xl font-medium tracking-tight">
            {title}
          </h3>
          <div
            className={cn(
              'flex min-w-0 flex-col items-start gap-3',
              // Under the name across the row: the type left, the channels right.
              '@min-[40rem]:flex-row @min-[40rem]:items-center @min-[40rem]:justify-between',
              // In its own column: the type at the top, the channels at the foot.
              '@min-[64rem]:flex-col @min-[64rem]:items-start',
            )}
          >
            {typeLabel && <p className="truncate text-sm">{typeLabel}</p>}
            {platforms.length > 0 ? (
              <span className="flex flex-wrap items-center gap-2.5">
                {platforms.map((p) => (
                  <PlatformMark key={p.id} platform={p} className="size-6" />
                ))}
              </span>
            ) : (
              <span className="text-sm">{t('campaigns.list.noChannels')}</span>
            )}
          </div>
        </div>

        {/* Where it is in its own time: the Overview's progress card. */}
        <div
          className={cn(
            column,
            '@min-[40rem]:[grid-area:3/1/span_2/2] @min-[40rem]:pr-6',
            '@min-[64rem]:[grid-area:1/2/span_2/3] @min-[64rem]:border-l @min-[64rem]:border-border @min-[64rem]:pl-6',
          )}
        >
          <div className="self-baseline">
            <ProgressHeader stage={model.stage} band={model.band} size="row" />
          </div>
          {failed ? (
            <p className="text-sm">{t('campaigns.list.loadFailed')}</p>
          ) : loading ? (
            <Skeleton className="h-10 w-full" />
          ) : model.stage === 'new' ? (
            <p className="text-sm">{t('campaigns.list.notDated')}</p>
          ) : model.results ? (
            <ResultsFigures results={model.results} size="row" />
          ) : model.band ? (
            <PostsBar band={model.band} size="row" />
          ) : null}
        </div>

        {/* What wants the user: the Overview's list, short. */}
        <div
          className={cn(
            column,
            '[&>:first-child]:self-baseline',
            '@min-[40rem]:[grid-area:3/2/span_2/3] @min-[40rem]:border-l @min-[40rem]:border-border @min-[40rem]:pl-6',
            '@min-[64rem]:[grid-area:1/3/span_2/4]',
          )}
        >
          {!failed && <NeedsPreview title={needs.title} lines={needs.lines} />}
        </div>
      </div>
    </div>
  )
}
