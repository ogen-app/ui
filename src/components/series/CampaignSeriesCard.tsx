import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { EntryRow, EntryRows, Facts, Ruled } from '@/components/brand/entry'
import {
  capital,
  lower,
  seriesMark,
  seriesRun,
} from '@/components/brand/entryMarks'
import { SmallHeading } from '@/components/page-primitives/SmallHeading'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ModalContainer } from '@/components/ui/modal'
import { useFeatureFlag } from '@/config/featureFlags'
import {
  useAttachSeries,
  useCampaignSeries,
  useDetachSeries,
  usePromoteSeries,
  useSeriesLibrary,
  useSetSeriesRhythm,
} from '@/hooks/useSeries'
import { brandSection } from '@/lib/brandSections'
import { contentFormatLabel } from '@/lib/contentFormats'
import { counted } from '@/lib/intl'
import { rhythmClaim } from '@/lib/seriesPlan'
import { cn } from '@/lib'
import type { Campaign } from '@/types/campaigns'
import type { ContentSeries, SeriesRhythm } from '@/types/series'
import { rhythmLine, supplyLine } from './format'
import { RhythmPicker } from './RhythmPicker'

/**
 * Which series this campaign runs, and how often — **the screen the feature is
 * actually used on** (CON-264).
 *
 * The workspace library answers *what do we have*. This answers *what is this
 * campaign making*, which is the question somebody has every day.
 *
 * ## The hub's rows, and two dialogs
 *
 * Each run is a one-line row, as a series is on the Foundation hub: its tick,
 * its name, and under it how often it runs here and what that claims. The
 * row's caret opens the run (`RunDialog`) — what the series is, its rhythm
 * here, stopping it, and for a series made inside this campaign, adding it to
 * the library. **Add series** in the header opens the other (`AddSeriesDialog`):
 * the workspace's series this campaign doesn't run yet, the rhythm opening
 * inside the one picked, and a way to write a new one. The controls used to
 * sit on every row — a rhythm picker, a promote button and an X each — which
 * made this the one card on Strategy that did not read like the others.
 *
 * ## Where it sits (CON-305)
 *
 * Strategy, under the campaign's voice and audience: the campaign's other card
 * about what it writes from. **The plan sentence is printed exactly once**, by
 * `SeriesShareLine` under the post goal it is a share of, and this card never
 * repeats it. What is here is the per-series claim, which is the arithmetic
 * that sentence sums. The alternative — a `/series` module at both levels —
 * stays a cheap move: this component takes a campaign and nothing else.
 *
 * A series defined in this campaign is bounded by it and offers a way up into
 * the library — that promotion is the ordinary path, and it is what fills the
 * library from use instead of from four generic nouns typed at onboarding.
 */
export function CampaignSeriesCard({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation()
  const enabled = useFeatureFlag('series')
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  const { data: library } = useSeriesLibrary()
  const { data: campaignSeries } = useCampaignSeries(campaign.id)

  // Nothing at all rather than a shell while the two queries land — the same
  // rule as `CampaignBrandCard` above it: a card that appears a beat later
  // pushes the rest of the page down under somebody who is already reading it.
  if (!enabled || !library || !campaignSeries) return null

  const section = brandSection('series')
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
  const openRun = runs.find((run) => run.seriesId === open)
  const openSeries = openRun ? byId.get(openRun.seriesId) : undefined

  return (
    <>
      <Card
        icon={section.icon}
        tone={section.tone}
        title={t('series.campaign.title')}
        action={{
          label: t('series.campaign.add'),
          icon: PlusSignIcon,
          onClick: () => setAdding(true),
        }}
        capped
      >
        {runs.length === 0 ? (
          <p className="text-sm leading-5">{t('series.campaign.empty')}</p>
        ) : (
          <EntryRows divided={false}>
            {runs.map((run) => {
              const series = byId.get(run.seriesId)
              // A run whose series has gone is not drawn as a blank row: the
              // stub deletes runs with their series, so this only happens to
              // a tab that was open across the deletion.
              if (!series) return null
              return (
                <EntryRow
                  key={run.seriesId}
                  mark={seriesMark(series)}
                  name={series.name}
                  meta={[
                    rhythmLine(t, run.rhythm),
                    claimLine(t, campaign, run.rhythm),
                    series.scope.kind === 'campaign'
                      ? t('series.campaign.localOnly')
                      : null,
                  ]
                    .filter(Boolean)
                    .join(t('brand.facts.separator'))}
                  onOpen={() => setOpen(run.seriesId)}
                />
              )
            })}
          </EntryRows>
        )}
      </Card>

      <AddSeriesDialog
        open={adding}
        campaign={campaign}
        available={available}
        libraryEmpty={
          !library.some((entry) => entry.scope.kind === 'workspace')
        }
        onClose={() => setAdding(false)}
      />

      {openRun && openSeries && (
        <RunDialog
          campaign={campaign}
          series={openSeries}
          rhythm={openRun.rhythm}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}

/**
 * What a run claims of the campaign's plan, as the share line under the post
 * goal sums it. Occasional claims nothing and says so rather than showing a
 * zero; without dates nothing is placed yet, and the line under the goal says
 * why, so there is no count to state (CON-496).
 */
function claimLine(
  t: TFunction,
  campaign: Campaign,
  rhythm: SeriesRhythm | null,
): string | null {
  if (!rhythm) return t('series.campaign.claimsNone')
  if (!campaign.start_date || !campaign.end_date) return null
  return t(
    'series.campaign.claim',
    counted(rhythmClaim(rhythm, campaign.start_date, campaign.end_date)),
  )
}

/* ── Add series ─────────────────────────────────────────────────────────── */

/**
 * The workspace's series this campaign doesn't run yet, one to pick, and how
 * often it runs here — which starts at the series' own rhythm and opens inside
 * the one picked, so it plainly belongs to it. Writing a new one leaves for the
 * series editor; it is added here once it exists.
 */
function AddSeriesDialog({
  open,
  campaign,
  available,
  libraryEmpty,
  onClose,
}: {
  open: boolean
  campaign: Campaign
  available: ContentSeries[]
  /** Nothing to pick because the workspace has none, not because all run here. */
  libraryEmpty: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const formats = useFeatureFlag('content-formats')
  const attach = useAttachSeries(campaign.id)
  const setRhythm = useSetSeriesRhythm(campaign.id)
  const [picked, setPicked] = useState<ContentSeries | null>(null)
  const [rhythm, setPickedRhythm] = useState<SeriesRhythm | null>(null)

  const close = () => {
    setPicked(null)
    onClose()
  }

  // An attach starts the run at the series' own rhythm (the server's rule), so
  // a different one is a second write once the first has landed.
  const add = async () => {
    if (!picked) return
    await attach.mutateAsync(picked.id)
    if (JSON.stringify(rhythm) !== JSON.stringify(picked.defaultRhythm))
      setRhythm.mutate({ seriesId: picked.id, rhythm })
    close()
  }

  return (
    <ModalContainer
      isOpen={open}
      onClose={close}
      title={t('series.campaign.addTitle')}
    >
      <div className="flex flex-col gap-6">
        {available.length === 0 ? (
          <p className="text-sm leading-5">
            {libraryEmpty
              ? t('series.campaign.addNoLibrary')
              : t('series.campaign.addNone')}
          </p>
        ) : (
          <ul role="radiogroup" className="flex flex-col gap-2">
            {available.map((series) => {
              const on = picked?.id === series.id
              return (
                <li
                  key={series.id}
                  className={cn(
                    'overflow-hidden rounded-md border',
                    on ? 'border-foreground bg-secondary' : 'border-border',
                  )}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setPicked(series)
                      setPickedRhythm(series.defaultRhythm)
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left',
                      !on && 'hover:bg-secondary',
                    )}
                  >
                    <Radio on={on} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm leading-5 font-semibold">
                        {series.name}
                      </span>
                      {series.promise && (
                        <span className="text-sm leading-5">
                          {series.promise}
                        </span>
                      )}
                      <span className="text-[13px] leading-5 text-secondary-foreground">
                        {capital(
                          [
                            formats && series.formatId
                              ? contentFormatLabel(t, series.formatId)
                              : null,
                            lower(rhythmLine(t, series.defaultRhythm)),
                          ]
                            .filter(Boolean)
                            .join(t('brand.facts.separator')),
                        )}
                      </span>
                    </span>
                  </button>
                  {on && (
                    <div className="pr-4 pb-4 pl-11">
                      <RhythmField
                        campaign={campaign}
                        rhythm={rhythm}
                        onChange={setPickedRhythm}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void navigate({
                to: '/foundation/series/$seriesId',
                params: { seriesId: 'new' },
              })
            }
          >
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} />
            <span>{t('series.campaign.writeNew')}</span>
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={close}>
            {t('series.campaign.cancel')}
          </Button>
          <Button
            type="button"
            variant="defaultInverted"
            disabled={!picked}
            loading={attach.isPending}
            onClick={() => void add()}
          >
            {t('series.campaign.add')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
        on ? 'border-foreground' : 'border-tertiary-foreground',
      )}
    >
      {on && <span className="size-2 rounded-full bg-foreground" />}
    </span>
  )
}

/* ── One run ────────────────────────────────────────────────────────────── */

/**
 * One run: what the series is, how often it runs here — saved as it changes,
 * which is why the dialog ends on Done rather than Save — and the ways out.
 */
function RunDialog({
  campaign,
  series,
  rhythm,
  onClose,
}: {
  campaign: Campaign
  series: ContentSeries
  rhythm: SeriesRhythm | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const formats = useFeatureFlag('content-formats')
  const setRhythm = useSetSeriesRhythm(campaign.id)
  const detach = useDetachSeries(campaign.id)
  const promote = usePromoteSeries()
  const local = series.scope.kind === 'campaign'

  return (
    <ModalContainer isOpen onClose={onClose} title={series.name}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          {series.promise && (
            <p className="text-sm leading-5">{series.promise}</p>
          )}
          <Ruled empty={t('series.library.noRecipe')}>
            {seriesRun(t, series)}
          </Ruled>
          <Facts
            items={[
              formats && series.formatId
                ? contentFormatLabel(t, series.formatId)
                : null,
              supplyLine(t, series.supply),
              local ? t('series.campaign.madeHere') : null,
            ]}
          />
        </div>

        <RhythmField
          campaign={campaign}
          rhythm={rhythm}
          // Each change builds on the rhythm the server last answered with,
          // so a second one before that answer would drop the first — the
          // picker waits for it.
          disabled={setRhythm.isPending}
          onChange={(next) =>
            setRhythm.mutate({ seriesId: series.id, rhythm: next })
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            loading={detach.isPending}
            onClick={() =>
              detach.mutate(series.id, { onSuccess: () => onClose() })
            }
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
            <span>{t('series.campaign.stop')}</span>
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void navigate({
                to: '/foundation/series/$seriesId',
                params: { seriesId: series.id },
              })
            }
          >
            {t('series.campaign.edit')}
          </Button>
          {local && (
            <Button
              type="button"
              variant="outline"
              loading={promote.isPending}
              onClick={() => promote.mutate(series.id)}
            >
              {t('series.campaign.promote')}
            </Button>
          )}
          <Button type="button" variant="defaultInverted" onClick={onClose}>
            {t('series.campaign.done')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}

/** How often, as the app's dropdowns on a card are: small buttons. */
function RhythmField({
  campaign,
  rhythm,
  disabled,
  onChange,
}: {
  campaign: Campaign
  rhythm: SeriesRhythm | null
  disabled?: boolean
  onChange: (rhythm: SeriesRhythm | null) => void
}) {
  const { t } = useTranslation()
  const claim = claimLine(t, campaign, rhythm)
  return (
    <div className="flex flex-col gap-2">
      <SmallHeading as="span">{t('series.campaign.howOften')}</SmallHeading>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <RhythmPicker
          value={rhythm}
          onChange={onChange}
          disabled={disabled}
          variant="button"
          size="sm"
          className="w-auto"
        />
        {claim && <span className="text-sm leading-5">{capital(claim)}</span>}
      </div>
    </div>
  )
}
