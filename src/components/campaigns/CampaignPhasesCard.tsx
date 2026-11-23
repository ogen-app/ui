import { useTranslation } from 'react-i18next'

import { Explainer } from '@/components/page-primitives/Explainer'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib'
import {
  useCampaignPhases,
  useResetPhasePlan,
  useSavePhasePlan,
} from '@/hooks/useCampaigns'
import { useLocale } from '@/hooks/useLocale'
import { formatDate, formatDateRange } from '@/lib/intl'
import { fetched } from '@/lib/fetched'
import {
  boundaryRange,
  canSplit,
  isDated,
  moveBoundary,
  windowDays,
  type DatedPhase,
} from '@/lib/phasePlan'
import type { CampaignPhasePlan } from '@/types/campaigns'

/**
 * An unsaved edit on the Strategy form that the plan on screen doesn't know
 * about yet. The windows are the server's answer for the *saved* campaign, so
 * while either of these is pending they describe something about to change.
 */
export type PhasePlanPending = 'dates' | 'type' | null

type Props = {
  campaignId: string
  pending: PhasePlanPending
}

type Move = NonNullable<ReturnType<typeof moveBoundary>>

/**
 * When each phase of the campaign's type runs (CON-166) — the second column of
 * a campaign's Strategy, beside what the campaign commits to.
 *
 * ## Why it says so much
 *
 * It used to be a bare list — a name, a purpose clamped to two lines, a range,
 * and a calendar glyph on all but the last row — and nobody could tell what
 * the dates were *for* or what moving one would do (2026-11-23). So the card
 * now answers those three questions in order:
 *
 * 1. **What a phase does** — the explainer: each post is written for the phase
 *    its date falls in, so the dates decide which goal a post serves.
 * 2. **Where the campaign is** — a bar across the campaign, one segment per
 *    phase at its share of the days, with today on it, and "Now" / "Done" on
 *    the rows. Where you are is the first thing anybody asks of a timeline.
 * 3. **What can be changed** — every phase but the last has "Ends [date]", a
 *    button that prints the date it changes, and the last says it ends with
 *    the campaign. A glyph alone said "a calendar" and nothing about which
 *    date, or that the next phase moves with it.
 *
 * The purpose is printed whole: it is the one line that says what the phase
 * is for, and clamping it is what left the dates meaningless.
 *
 * The windows come from `GET /phases` — the server's even split of the
 * campaign dates until someone edits them — and are never worked out here.
 * What a person can do is move the day one phase ends, from the calendar on
 * its row, which moves the next phase's start with it (`lib/phasePlan`), so
 * the plan stays back to back and every PUT is one the server accepts. The
 * last phase has none: its end is the campaign's. Each move persists on the
 * spot: the plan is its own resource, not a field the page's Save holds.
 */
export function CampaignPhasesCard({ campaignId, pending }: Props) {
  const { t } = useTranslation()
  const query = useCampaignPhases(campaignId)
  const save = useSavePhasePlan(campaignId, {
    errorTitle: t('campaigns.phases.saveError'),
  })
  const reset = useResetPhasePlan(campaignId, {
    errorTitle: t('campaigns.phases.resetError'),
  })
  const plan = fetched(query)
  const busy = save.isPending || reset.isPending

  const resettable =
    plan.status === 'ready' && plan.data.source === 'manual' && !pending

  return (
    <Card
      title={t('campaigns.phases.title')}
      capped
      action={
        resettable
          ? {
              label: t('campaigns.phases.reset'),
              disabled: busy,
              onClick: () => reset.mutate(null),
            }
          : undefined
      }
    >
      {plan.status === 'pending' && (
        <div className="flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-5 w-2/5" />
        </div>
      )}
      {plan.status === 'error' && (
        <p className="text-sm">{t('campaigns.phases.loadError')}</p>
      )}
      {plan.status === 'ready' && (
        <PhaseList
          plan={plan.data}
          pending={pending}
          busy={busy}
          onMove={(next) => save.mutate(next)}
        />
      )}
    </Card>
  )
}

function PhaseList({
  plan,
  pending,
  busy,
  onMove,
}: {
  plan: CampaignPhasePlan
  pending: PhasePlanPending
  busy: boolean
  onMove: (next: Move) => void
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { phases } = plan

  if (phases.length === 0) {
    return <p className="text-sm">{t('campaigns.phases.empty')}</p>
  }

  const splittable = canSplit(phases)
  const editable = splittable && !pending
  const dated = phases.filter(isDated)
  const allDated = dated.length === phases.length
  // Local, as a calendar day, so it compares with the wire's dates as strings.
  const today = localISO(new Date())
  const day = (iso: string) => new Date(`${iso}T00:00:00`)
  const range = (phase: DatedPhase) =>
    formatDateRange(
      day(phase.start_date),
      day(phase.end_date),
      { month: 'short', day: 'numeric' },
      locale,
    )

  // One line stating where the dates stand. It changes with the campaign, so
  // it is printed under the list rather than taught in the note.
  const status = pending
    ? t(
        pending === 'dates'
          ? 'campaigns.phases.pendingDates'
          : 'campaigns.phases.pendingType',
      )
    : plan.source === 'unscheduled'
      ? t('campaigns.phases.unscheduled')
      : dated.length > 1 && !splittable
        ? t('campaigns.phases.tooShort', { count: phases.length })
        : t(
            plan.source === 'manual'
              ? 'campaigns.phases.manual'
              : 'campaigns.phases.derived',
          )

  return (
    <div className="flex flex-col gap-4">
      <Explainer id="campaign-phases">
        {t('campaigns.phases.explainer')}
      </Explainer>

      {allDated && <Timeline phases={dated} today={today} />}

      <ol className="flex flex-col">
        {phases.map((phase, i) => {
          const when = isDated(phase) ? standing(phase, today) : null
          const last = i === phases.length - 1
          return (
            <li
              key={phase.phase_id}
              className="flex gap-3 border-b border-tertiary py-3 first:pt-0 last:border-b-0 last:pb-0"
            >
              <span className="w-4 shrink-0 text-sm tabular-nums">{i + 1}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{phase.name}</span>
                  {when === 'now' && (
                    <span className="text-xs font-medium text-info">
                      {t('campaigns.phases.now')}
                    </span>
                  )}
                  {when === 'done' && (
                    <span className="text-xs text-tertiary-foreground">
                      {t('campaigns.phases.done')}
                    </span>
                  )}
                </p>
                {phase.purpose && <p className="text-sm">{phase.purpose}</p>}
                <p className="text-sm">
                  {isDated(phase)
                    ? t('campaigns.phases.meta', {
                        range: range(phase),
                        days: t('campaigns.phases.days', {
                          count: windowDays(phase.start_date, phase.end_date),
                        }),
                        posts: t('campaigns.phases.posts', {
                          count: phase.post_count,
                        }),
                      })
                    : t('campaigns.phases.posts', { count: phase.post_count })}
                </p>
                {isDated(phase) &&
                  (last ? (
                    <p className="text-sm">
                      {t('campaigns.phases.endsWithCampaign', {
                        date: formatDate(
                          day(phase.end_date),
                          { month: 'short', day: 'numeric' },
                          locale,
                        ),
                      })}
                    </p>
                  ) : editable ? (
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span>{t('campaigns.phases.ends')}</span>
                      <BoundaryPicker
                        phases={dated}
                        index={i}
                        disabled={busy}
                        onMove={onMove}
                      />
                    </div>
                  ) : null)}
              </div>
            </li>
          )
        })}
      </ol>
      <p className="text-sm">
        {status}
        {editable && <> {t('campaigns.phases.howToMove')}</>}
      </p>
    </div>
  )
}

/**
 * The campaign as one bar: a segment per phase at its share of the days, the
 * current one in ink and the others in the track's grey, and a tick where
 * today falls. The numbers match the rows under it.
 */
function Timeline({ phases, today }: { phases: DatedPhase[]; today: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const first = phases[0]
  const last = phases[phases.length - 1]
  const total = windowDays(first.start_date, last.end_date)
  const elapsed = windowDays(first.start_date, today) - 1
  const inside = elapsed >= 0 && elapsed < total
  const edge = (iso: string) =>
    formatDate(
      new Date(`${iso}T00:00:00`),
      { month: 'short', day: 'numeric' },
      locale,
    )

  return (
    <figure
      className="flex flex-col gap-1.5"
      aria-label={t('campaigns.phases.timeline')}
    >
      <div className="relative flex h-6 gap-0.5">
        {phases.map((phase, i) => {
          const now = standing(phase, today) === 'now'
          return (
            <div
              key={phase.phase_id}
              className={cn(
                'flex min-w-0 items-center justify-center rounded-sm text-xs tabular-nums',
                now
                  ? 'bg-foreground text-primary'
                  : 'bg-tertiary text-foreground',
              )}
              style={{
                flexGrow: windowDays(phase.start_date, phase.end_date),
                flexBasis: 0,
              }}
              title={phase.name}
            >
              {i + 1}
            </div>
          )
        })}
        {inside && (
          <span
            aria-hidden
            className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-info"
            style={{ left: `${((elapsed + 0.5) / total) * 100}%` }}
          />
        )}
      </div>
      <figcaption className="flex justify-between text-xs text-tertiary-foreground">
        <span>{edge(first.start_date)}</span>
        <span>{edge(last.end_date)}</span>
      </figcaption>
    </figure>
  )
}

/** Where today sits against one phase's window. */
function standing(phase: DatedPhase, today: string): 'done' | 'now' | 'later' {
  if (today > phase.end_date) return 'done'
  if (today >= phase.start_date) return 'now'
  return 'later'
}

function localISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** The day phase `index` ends — and so the day before the next one starts. */
function BoundaryPicker({
  phases,
  index,
  disabled,
  onMove,
}: {
  phases: DatedPhase[]
  index: number
  disabled: boolean
  onMove: (next: Move) => void
}) {
  const { t } = useTranslation()
  const phase = phases[index]
  const { min, max } = boundaryRange(phases, index)
  return (
    <DatePicker
      variant="button"
      size="sm"
      aria-label={t('campaigns.phases.endsLabel', { phase: phase.name })}
      value={`${phase.end_date}T00:00:00`}
      min={`${min}T00:00:00`}
      max={`${max}T00:00:00`}
      clearable={false}
      disabled={disabled}
      onChange={(next) => {
        if (!next || next === phase.end_date) return
        const plan = moveBoundary(phases, index, next)
        if (plan) onMove(plan)
      }}
    />
  )
}
