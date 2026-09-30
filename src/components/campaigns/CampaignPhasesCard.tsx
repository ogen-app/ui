import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { Explainer } from '@/components/page-primitives/Explainer'
import { SettingsCard } from '@/components/settings/SettingsCard'
import {
  useCampaignPhases,
  useResetPhasePlan,
  useSavePhasePlan,
} from '@/hooks/useCampaigns'
import { useLocale } from '@/hooks/useLocale'
import { formatDate } from '@/lib/intl'
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

/**
 * When each phase of the campaign's type runs (CON-166).
 *
 * The windows come from `GET /phases` — the server's even split of the
 * campaign dates until someone edits them — and are never worked out here.
 * What a person can do is move the day one phase ends, which moves the next
 * phase's start with it (`lib/phasePlan`), so the plan stays back to back and
 * every PUT is one the server accepts. Each move persists on the spot, like
 * the platform toggles further down: the plan is its own resource, not a field
 * the page's Save holds.
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
      <div className="flex flex-col gap-4">
        <Explainer id="campaign-phases">
          {t('campaigns.phases.explainer')}
        </Explainer>
        {plan.status === 'pending' && <Skeleton className="h-24 w-full" />}
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
      </div>
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
  onMove: (next: NonNullable<ReturnType<typeof moveBoundary>>) => void
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
  const day = (iso: string) =>
    // Local midnight, so the calendar day on the wire is the one printed.
    formatDate(`${iso}T00:00:00`, { month: 'short', day: 'numeric' }, locale)

  // One line stating where the dates stand. Never inside the Explainer: it
  // changes with the campaign, and a closed note would take it along.
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
          const window = isDated(phase) ? phase : null
          const hasBoundary = editable && i < phases.length - 1
          return (
            <li
              key={phase.phase_id}
              className="flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{phase.name}</span>
                  {phase.purpose && (
                    <span className="text-sm text-secondary-foreground">
                      {phase.purpose}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1 pl-9 text-sm sm:items-end sm:pl-0">
                {window && (
                  <span>
                    {t('campaigns.phases.window', {
                      start: day(window.start_date),
                      end: day(window.end_date),
                    })}
                  </span>
                )}
                <span className="text-tertiary-foreground">
                  {window &&
                    `${t('campaigns.phases.days', {
                      count: windowDays(window.start_date, window.end_date),
                    })} · `}
                  {t('campaigns.phases.posts', { count: phase.post_count })}
                </span>
                {hasBoundary && (
                  <BoundaryPicker
                    phases={dated}
                    index={i}
                    disabled={busy}
                    onMove={onMove}
                  />
                )}
              </div>
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
  onMove: (next: NonNullable<ReturnType<typeof moveBoundary>>) => void
}) {
  const { t } = useTranslation()
  const phase = phases[index]
  const { min, max } = boundaryRange(phases, index)
  return (
    <div
      role="group"
      aria-label={t('campaigns.phases.endsLabel', { phase: phase.name })}
      className="flex items-center gap-2"
    >
      <span className="text-tertiary-foreground">
        {t('campaigns.phases.ends')}
      </span>
      <DatePicker
        size="sm"
        className="w-40"
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
    </div>
  )
}
