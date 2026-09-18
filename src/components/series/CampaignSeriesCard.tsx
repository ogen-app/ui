import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowUpRightIcon, RepeatIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/settings/SettingsCard'
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
import { rhythmClaim } from '@/lib/seriesPlan'
import type { Campaign } from '@/types/campaigns'
import { supplyLine } from './format'
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
 * ## Where it sits, and what that cost (CON-305)
 *
 * It was a band on the campaign's Foundation page, above the documents table.
 * That page no longer exists — the documents became their own module at
 * `/assets` — so the address and the shape were both open again, and the answer
 * taken was **Strategy, under `CampaignBrandCard`**: the campaign's other card
 * about what it writes from, on the one screen that is already about what this
 * campaign commits to.
 *
 * That overrules this component's original argument, which was that the rhythm
 * controls must stay off Strategy because *Strategy prints the result and owns
 * none of it*. The worry it names is real and is answered by arrangement rather
 * than by distance: **the plan sentence is printed exactly once**, by
 * `SeriesShareLine` under the post goal it is a share of, and this card never
 * repeats it. What is here is the per-series claim, which is the arithmetic
 * that sentence sums. Two *controls* over one number was the failure to avoid;
 * a control and the total it feeds, on one page, is how every other card on
 * Strategy already works.
 *
 * The alternative — a `/series` module at both levels, the move documents just
 * made — stays available and is a cheap one to make: this component takes a
 * campaign and nothing else, so it is a re-parent plus two nav rows, not a
 * rewrite. See CON-305 decision 1 for what would argue for it.
 *
 * A series defined in this campaign is bounded by it and shows a way up into
 * the library — that promotion is the ordinary path, and it is what fills the
 * library from use instead of from four generic nouns typed at onboarding.
 */
export function CampaignSeriesCard({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const enabled = useFeatureFlag('series')

  const { data: library } = useSeriesLibrary()
  const { data: campaignSeries } = useCampaignSeries(campaign.id)
  const attach = useAttachSeries(campaign.id)
  const detach = useDetachSeries(campaign.id)
  const setRhythm = useSetSeriesRhythm(campaign.id)
  const promote = usePromoteSeries()

  // Nothing at all rather than a shell while the two queries land — the same
  // rule, and the same one line of code, as `CampaignBrandCard` above it: a
  // card that appears a beat later pushes the rest of the page down under
  // somebody who is already reading it.
  if (!enabled || !library || !campaignSeries) return null

  const runs = campaignSeries.runs
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
    <SettingsCard
      title={
        <>
          <RepeatIcon className="size-5 text-tertiary-foreground" />
          {t('series.campaign.title')}
        </>
      }
    >
      <p className="text-sm text-tertiary-foreground">
        {t('series.campaign.hint')}
      </p>

      {runs.length === 0 ? (
        <p className="text-sm leading-5 text-secondary-foreground">
          {t('series.campaign.empty')}
        </p>
      ) : (
        <ul className="flex flex-col">
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
                className="flex flex-wrap items-center gap-3 border-b border-tertiary px-3 py-3 last:border-b-0"
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

                {/* The arithmetic, per row, so the share printed under the
                    post goal is never just asserted. Occasional claims nothing
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
            // action, not a field, and leaving a series' name in the trigger
            // would read as the campaign having selected it.
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
    </SettingsCard>
  )
}
