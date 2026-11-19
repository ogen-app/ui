import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { LineItem } from '@/components/ui/line-item'
import { Skeleton } from '@/components/ui/skeleton'
import { SettingsCard } from '@/components/settings/SettingsCard'
import {
  useCampaignPhases,
  useResetPhasePlan,
  useSavePhasePlan,
} from '@/hooks/useCampaigns'
import { useLocale } from '@/hooks/useLocale'
import { formatDateRange } from '@/lib/intl'
import { fetched } from '@/lib/fetched'
import {
  boundaryRange,
  canSplit,
  isDated,
  moveBoundary,
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
 * Drawn the way Strategy for all campaigns draws its cards: a heading, then
 * one `LineItem` per phase — its name, what it is for, and when it runs with
 * how many posts are planned into it. Nothing else: the number of days is in
 * the range, and the order is the list's.
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
    <SettingsCard
      title={t('campaigns.phases.title')}
      actions={
        resettable ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => reset.mutate(null)}
          >
            {t('campaigns.phases.reset')}
          </Button>
        ) : undefined
      }
    >
      {plan.status === 'pending' && (
        <div className="flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-5 w-2/5" />
        </div>
      )}
      {plan.status === 'error' && (
        <p className="text-sm text-secondary-foreground">
          {t('campaigns.phases.loadError')}
        </p>
      )}
      {plan.status === 'ready' && (
        <PhaseList
          plan={plan.data}
          pending={pending}
          busy={busy}
          onMove={(next) => save.mutate(next)}
        />
      )}
    </SettingsCard>
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
    return (
      <p className="text-sm text-secondary-foreground">
        {t('campaigns.phases.empty')}
      </p>
    )
  }

  const splittable = canSplit(phases)
  const editable = splittable && !pending
  const dated = phases.filter(isDated)
  const range = (phase: DatedPhase) =>
    // Local midnight, so the calendar day on the wire is the one printed.
    formatDateRange(
      new Date(`${phase.start_date}T00:00:00`),
      new Date(`${phase.end_date}T00:00:00`),
      { month: 'short', day: 'numeric' },
      locale,
    )

  // One line stating where the dates stand. It changes with the campaign, so
  // it is printed under the list rather than taught in a note.
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
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col">
        {phases.map((phase, i) => {
          const posts = t('campaigns.phases.posts', { count: phase.post_count })
          return (
            <li key={phase.phase_id}>
              <LineItem
                variant="entry"
                indicator={{
                  kind: 'custom',
                  node: (
                    <span className="text-xs tabular-nums text-tertiary-foreground">
                      {i + 1}
                    </span>
                  ),
                }}
                label={phase.name}
                details={phase.purpose || undefined}
                meta={
                  isDated(phase)
                    ? t('campaigns.phases.meta', {
                        range: range(phase),
                        posts,
                      })
                    : posts
                }
                trailing={
                  editable && i < phases.length - 1 ? (
                    <BoundaryPicker
                      phases={dated}
                      index={i}
                      disabled={busy}
                      onMove={onMove}
                    />
                  ) : undefined
                }
              />
            </li>
          )
        })}
      </ol>
      <p className="text-sm text-secondary-foreground">{status}</p>
    </div>
  )
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
      variant="icon"
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
