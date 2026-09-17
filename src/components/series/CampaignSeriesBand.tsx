import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRightIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Collapse } from '@/components/ui/collapse'
import { TextSelect } from '@/components/ui/text-select'
import { useFeatureFlag } from '@/config/featureFlags'
import {
  useAttachSeries,
  useCampaignSeries,
  useDetachSeries,
  usePromoteSeries,
  useSeriesLibrary,
  useSetSeriesRhythm,
} from '@/hooks/useSeries'
import { rhythmClaim, seriesPlan } from '@/lib/seriesPlan'
import { normalizeGoalCadence } from '@/lib/postGoal'
import type { Campaign } from '@/types/campaigns'
import { planLine, supplyLine } from './format'
import { RhythmPicker } from './RhythmPicker'

/**
 * Which series this campaign runs, and how often — **the screen the feature is
 * actually used on** (CON-264).
 *
 * The workspace library answers *what do we have*. This answers *what is this
 * campaign making*, which is the question somebody has every day, and it is why
 * the campaign level was built first. Everything here is a control: pick a
 * series up, give it a rate, drop it. The library page has none.
 *
 * ## Why the rhythm lives here and not on Strategy
 *
 * Because there is no mix to set. A campaign does not allocate percentages; it
 * says how often each of its series runs, and the share is arithmetic over
 * those rhythms (`lib/seriesPlan`). Strategy prints the result and owns none of
 * it — two controls over one number is how a plan and its parts start
 * disagreeing.
 *
 * ## Why it is a band and not a section
 *
 * Honestly: because the campaign's Foundation page is the documents table today
 * and splitting it into sections is a bigger change than this feature should
 * make on its way in. Open by default, unlike the inherited-brand band above it,
 * because that one is a reminder and this one is where the work happens — and
 * kept to one row per series so a campaign running five does not push the table
 * it sits above off the screen. **If this survives review, the campaign's
 * Foundation page wants the same hub-and-sections shape the workspace's has**,
 * and this component becomes the section rather than the band.
 *
 * A series defined in this campaign is bounded by it and shows a way up into
 * the library — that promotion is the ordinary path, and it is what fills the
 * library from use instead of from four generic nouns typed at onboarding.
 */
export function CampaignSeriesBand({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const enabled = useFeatureFlag('series')

  const { data: library } = useSeriesLibrary()
  const { data: campaignSeries } = useCampaignSeries(campaign.id)
  const attach = useAttachSeries(campaign.id)
  const detach = useDetachSeries(campaign.id)
  const setRhythm = useSetSeriesRhythm(campaign.id)
  const promote = usePromoteSeries()

  const runs = useMemo(() => campaignSeries?.runs ?? [], [campaignSeries])

  const plan = useMemo(
    () =>
      seriesPlan({
        postsPerPeriod: campaign.estimated_post_count,
        cadence: normalizeGoalCadence(campaign.goal_cadence),
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        runs,
      }),
    [campaign, runs],
  )

  // Nothing at all rather than a shell while the two queries land: this sits
  // above the table the page was opened for, and a band that appears a beat
  // later shoves it down. Same rule as `InheritedBrand`.
  if (!enabled || !library || !campaignSeries) return null

  const byId = new Map(library.map((entry) => [entry.id, entry]))
  // Everything this campaign could still pick up: the workspace library, minus
  // what it already runs. Its own local series are never in here — they are
  // already attached by construction.
  const available = library.filter(
    (entry) =>
      entry.scope.kind === 'workspace' &&
      !runs.some((run) => run.seriesId === entry.id),
  )

  return (
    <div className="border-b border-tertiary px-3 lg:px-6">
      <Collapse
        defaultOpen
        title={t('series.campaign.title')}
        description={planLine(t, plan)}
        className="mx-auto w-full max-w-content"
      >
        <div className="flex flex-col gap-3 pb-4">
          {runs.length === 0 ? (
            <p className="text-sm leading-5 text-secondary-foreground">
              {t('series.campaign.empty')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {runs.map((run) => {
                const series = byId.get(run.seriesId)
                // A run whose series has gone is not drawn as a blank row: the
                // stub deletes runs with their series, so this only happens to
                // a tab that was open across the deletion.
                if (!series) return null
                const claim = rhythmClaim(
                  run.rhythm,
                  campaign.start_date,
                  campaign.end_date,
                )
                const local = series.scope.kind === 'campaign'

                return (
                  <li
                    key={run.seriesId}
                    className="flex flex-wrap items-center gap-3 bg-primary px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {series.name}
                      </span>
                      <span className="truncate text-sm text-secondary-foreground">
                        {supplyLine(t, series.supply)}
                        {local ? ` · ${t('series.campaign.localOnly')}` : ''}
                      </span>
                    </div>

                    <RhythmPicker
                      variant="inline"
                      className="w-auto"
                      value={run.rhythm}
                      onChange={(rhythm) =>
                        setRhythm.mutate({ seriesId: run.seriesId, rhythm })
                      }
                    />

                    {/* The arithmetic, per row, so the total on the collapsed
                        line is never just asserted. Occasional claims nothing
                        and says so rather than showing a zero. */}
                    <span className="w-28 shrink-0 text-right text-sm text-secondary-foreground">
                      {run.rhythm
                        ? t('series.campaign.claim', { count: claim })
                        : t('series.campaign.claimsNone')}
                    </span>

                    {local ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => promote.mutate(series.id)}
                        title={t('series.campaign.promoteHint')}
                      >
                        <ArrowUpRightIcon className="size-4" />
                        <span className="uppercase">
                          {t('series.campaign.promote')}
                        </span>
                      </Button>
                    ) : null}

                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t('series.campaign.remove', {
                        name: series.name,
                      })}
                      onClick={() => detach.mutate(run.seriesId)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {available.length > 0 ? (
              <TextSelect
                variant="inline"
                className="w-auto"
                // Always shows the prompt rather than the last pick: this is an
                // action, not a field, and leaving a series' name in the
                // trigger would read as the campaign having selected it.
                value=""
                placeholder={t('series.campaign.addPlaceholder')}
                elements={available.map((entry) => ({
                  id: entry.id,
                  displayValue: entry.name,
                }))}
                onValueChange={(seriesId) => attach.mutate(seriesId)}
              />
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({
                  to: '/foundation/series/$seriesId',
                  params: { seriesId: 'new' },
                })
              }
            >
              <span className="uppercase">{t('series.campaign.writeOne')}</span>
            </Button>
          </div>
        </div>
      </Collapse>
    </div>
  )
}
