import { useEffect, useRef, useState } from 'react'

import { Explainer } from '@/components/page-primitives/Explainer'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TextSelect } from '@/components/ui/text-select'
import { usePlatforms, usePlatformViews } from '@/hooks/usePlatforms'
import { usePostGoal } from '@/hooks/usePostGoal'
import { cn } from '@/lib'
import { connectedAccounts } from '@/lib/platformDictionary'
import {
  describePostGoalTotal,
  postGoalTotal,
  type PostGoalPeriod,
} from '@/lib/postGoal'
import type { Campaign } from '@/types/campaigns'

const PERIOD_OPTIONS = [
  { id: 'weekly', displayValue: 'Every week' },
  { id: 'monthly', displayValue: 'Every month' },
  { id: 'total', displayValue: 'Over the whole campaign' },
] as const


type Props = {
  campaign: Campaign
  /** The platforms the campaign targets, as the form currently has them. */
  platformIds: string[]
  startDate: string | null
  endDate: string | null
  /**
   * The campaign total the goal works out to, for the form's
   * `estimated_post_count` — `null` when the goal is off or not yet countable.
   * Only called on a change, never on load: an untouched card must not dirty
   * the page, let alone overwrite a total nobody edited.
   */
  onTotalChange: (total: number | null) => void
}

/**
 * How much the campaign should produce (CON-156 §3).
 *
 * The goal is set **per connected account** and per period, and the campaign
 * total — which is what the overview, the readiness rules and the assistant all
 * read — is computed from it rather than typed. See `lib/postGoal`.
 *
 * The card is activated rather than always-on: a campaign without a goal is a
 * normal campaign, not one with an empty field in it, so the switch says which
 * it is and everything below it only exists once there is a goal to describe.
 */
export function PostGoalCard({
  campaign,
  platformIds,
  startDate,
  endDate,
  onTotalChange,
}: Props) {
  // What the campaign can actually publish through: the accounts connected for
  // the platforms it targets. A targeted platform with no account contributes
  // nothing — it cannot publish, so it cannot carry a goal either.
  const views = usePlatformViews()
  const { isLoading: platformsLoading } = usePlatforms()
  const targeted = new Set(platformIds)
  const accounts = views
    .filter((v) => targeted.has(v.platform.id))
    .reduce((n, v) => n + connectedAccounts(v).length, 0)

  const { goal, isPending: goalLoading, dirty, setGoal, save } = usePostGoal(campaign, accounts)
  useRegisterSettingsSave('campaign-goal', dirty, save)

  // Both halves of the total, or neither. The platform query settles on its own
  // schedule, so waiting only on the goal would let the account count jump from
  // 0 to its real value *after* the first sync was spent — writing a total, and
  // dirtying the page, for a user who only opened it.
  const isPending = goalLoading || platformsLoading

  const total = postGoalTotal(goal, {
    platforms: platformIds.length,
    accounts,
    startDate,
    endDate,
  })
  const totalValue = total.kind === 'ok' ? total.total : null

  // The count is held as text so a half-typed field behaves: clearing it reads
  // as "no goal yet" rather than snapping back to the last number.
  const [countText, setCountText] = useState<string | null>(null)
  const count = countText ?? (goal.perAccount > 0 ? String(goal.perAccount) : '')

  // The total follows the goal, the accounts and the dates, so it is synced
  // from an effect rather than from each handler. The first settled run is
  // skipped: that one is the stored goal arriving, and pushing it into the
  // form would mark the page dirty — and clear the campaign's own total — for
  // a user who has done nothing but open the page.
  const firstSync = useRef(true)
  useEffect(() => {
    if (isPending) return
    if (firstSync.current) {
      firstSync.current = false
      return
    }
    onTotalChange(totalValue)
  }, [isPending, totalValue, goal.enabled, onTotalChange])

  return (
    <SettingsCard
      title="Goals"
      actions={
        // A button rather than a switch: this opens and closes a whole section
        // of the card, so it is worth naming what the click does instead of
        // asking the user to read a state off a pill.
        <Button
          type="button"
          variant="outline"
          onClick={() => setGoal({ enabled: !goal.enabled })}
          disabled={isPending}
        >
          {goal.enabled ? 'Switch off' : 'Switch on'}
        </Button>
      }
    >
      <div className="flex flex-col">
        {/* Outside the Explainer on purpose: this is the state of the campaign,
            not a lesson, so it has to survive the note being closed. */}
        {!goal.enabled && (
          <p className="text-sm text-tertiary-foreground">
            No post goal — Ogen plans the campaign without a number to hit.
          </p>
        )}

        {/* `grid-template-rows` rather than `height`: the block has no height to
            name up front, and 0fr→1fr animates to whatever it turns out to be.
            `visibility` rides along so a collapsed card doesn't hold focusable
            controls a keyboard user would tab into blind. */}
        <div
          className={cn(
            'grid transition-[grid-template-rows,visibility] duration-200 ease-out',
            goal.enabled ? 'grid-rows-[1fr] visible' : 'grid-rows-[0fr] invisible',
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-5">
              {/* Inside the collapse: with the goal off there is nothing to
                  explain, and the note would be the tallest thing on a card
                  that is switched off. */}
              <Explainer id="campaign-post-goal">
                The post goal is what Ogen plans against — how much content it drafts
                for the campaign, and what the overview measures progress against. You
                set it per account, and Ogen works out the campaign total from the
                accounts your platforms publish through and the campaign&rsquo;s dates.
              </Explainer>

              {isPending ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="post-goal-count">Posts per account</Label>
                      <Input
                        id="post-goal-count"
                        type="number"
                        min={0}
                        placeholder="e.g. 3"
                        value={count}
                        onChange={(e) => {
                          setCountText(e.target.value)
                          const parsed = Number(e.target.value)
                          setGoal({
                            perAccount:
                              Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0,
                          })
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="post-goal-period">Counted</Label>
                      <TextSelect
                        id="post-goal-period"
                        variant="default"
                        size="default"
                        value={goal.period}
                        onValueChange={(period) =>
                          setGoal({ period: period as PostGoalPeriod })
                        }
                        elements={PERIOD_OPTIONS}
                      />
                    </div>
                  </div>

                  {/* The number the campaign is actually planned against, with
                      the arithmetic that produced it — it is written to the
                      campaign on Save, so it can't be left implicit. */}
                  <p
                    className={cn(
                      'text-sm',
                      total.kind === 'ok' ? 'text-foreground' : 'text-warning',
                    )}
                  >
                    {describePostGoalTotal(goal, total)}
                  </p>

                  <PerPlatformNote />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </SettingsCard>
  )
}

/**
 * What the goal will be able to do, but can't yet: one number per platform
 * rather than one for all of them. Announced rather than hidden — it is why
 * the field above is worded as a goal *per account*, and a planner deciding
 * how to split Instagram from LinkedIn needs to know it is coming.
 *
 * Not an option: there is nothing to choose between while it is the only
 * alternative to the default, so it doesn't pretend to be selectable.
 */
function PerPlatformNote() {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-quaternary px-4 py-3 opacity-60">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">A goal per platform</span>
        <span className="text-xs text-tertiary-foreground">
          Different numbers for Instagram, LinkedIn, and the rest.
        </span>
      </div>
      <span className="shrink-0 rounded-full bg-tertiary px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] text-tertiary-foreground">
        COMING SOON
      </span>
    </div>
  )
}
