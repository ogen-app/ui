import { useState } from 'react'
import { useFormContext } from 'react-hook-form'

import { Explainer } from '@/components/page-primitives/Explainer'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextSelect } from '@/components/ui/text-select'
import { cn } from '@/lib'
import {
  describePostGoalTotal,
  postGoalTotal,
  type GoalCadence,
} from '@/lib/postGoal'
import type { StrategyFormValues } from './schema'
import { useTranslation } from 'react-i18next'
import { useFeatureFlag } from '@/config/featureFlags'
import { useCampaignSeries } from '@/hooks/useSeries'
import { seriesPlan } from '@/lib/seriesPlan'
import { planLine } from '@/components/series/format'

/**
 * What the campaign's series already claim of its goal (CON-264).
 *
 * Reads the live form values rather than the saved campaign, so the line moves
 * with the rate somebody is typing — a share computed against the stored goal
 * would contradict the total printed directly above it for as long as the form
 * stayed dirty.
 *
 * Silent when the campaign runs no series: a line reading *0 of 12 spoken for*
 * on every campaign in the workspace is furniture, not information.
 */
function SeriesShareLine({
  campaignId,
  postsPerPeriod,
  cadence,
  startDate,
  endDate,
}: {
  campaignId: string
  postsPerPeriod: number | null
  cadence: GoalCadence
  startDate: string | null
  endDate: string | null
}) {
  const { t } = useTranslation()
  const enabled = useFeatureFlag('series')
  const { data } = useCampaignSeries(campaignId)

  if (!enabled || !data || data.runs.length === 0) return null

  const plan = seriesPlan({
    postsPerPeriod,
    cadence,
    startDate,
    endDate,
    runs: data.runs,
  })

  return (
    <p
      className={cn(
        'text-sm',
        plan.over > 0 ? 'text-warning' : 'text-foreground',
      )}
    >
      {planLine(t, plan)}
    </p>
  )
}

const CADENCE_OPTIONS = [
  { id: 'week', displayValue: 'Every week' },
  { id: 'month', displayValue: 'Every month' },
] as const

/**
 * How much the campaign should produce (CON-182).
 *
 * The goal is a rate — so many posts a week or a month — and the campaign total
 * the content plan generates against is that rate multiplied by the periods the
 * campaign's dates span. Both halves are campaign columns
 * (`estimated_post_count`, `goal_cadence`), edited here and written by the
 * page's Save with everything else.
 *
 * The card is activated rather than always-on: a campaign without a goal is a
 * normal campaign, not one with an empty field in it, so the button says which
 * it is and everything below it only exists once there is a goal to describe.
 */
export function PostGoalCard({ campaignId }: { campaignId: string }) {
  const form = useFormContext<StrategyFormValues>()
  const count = form.watch('estimated_post_count')
  const cadence = form.watch('goal_cadence')
  const startDate = form.watch('start_date')
  const endDate = form.watch('end_date')

  // A goal is "off" by having no count, so the open/closed state can't be read
  // back off the value alone — a user who switches the card on has an empty
  // field until they type in it, and the section must stay open meanwhile.
  const [enabled, setEnabled] = useState(() => Number(count) > 0)

  const perPeriod = count.trim() === '' ? null : Number(count)
  const total = postGoalTotal(
    Number.isFinite(perPeriod) ? perPeriod : null,
    cadence,
    startDate,
    endDate,
  )

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    // Switching off is the edit that removes the goal, so it clears the column
    // rather than just hiding the field it was typed in.
    if (!next) {
      form.setValue('estimated_post_count', '', { shouldDirty: true })
    }
  }

  return (
    <SettingsCard
      title="Goals"
      actions={
        // A button rather than a switch: this opens and closes a whole section
        // of the card, so it is worth naming what the click does instead of
        // asking the user to read a state off a pill.
        <Button type="button" variant="outline" onClick={toggle}>
          {/* Literal caps, not `uppercase` — the caps are the copy, same rule
              the Danger Zone labels follow. */}
          {enabled ? 'SWITCH OFF' : 'SWITCH ON'}
        </Button>
      }
    >
      <div className="flex flex-col">
        {/* Outside the Explainer on purpose: this is the state of the campaign,
            not a lesson, so it has to survive the note being closed. */}
        {!enabled && (
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
            enabled ? 'grid-rows-[1fr] visible' : 'grid-rows-[0fr] invisible',
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-5">
              {/* Inside the collapse: with the goal off there is nothing to
                  explain, and the note would be the tallest thing on a card
                  that is switched off. */}
              <Explainer id="campaign-post-goal">
                The post goal is what Ogen plans against — how much content it
                drafts for the campaign, and what the overview measures progress
                against. You set the rate, and Ogen works out the campaign total
                from how long the campaign runs.
              </Explainer>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="post-goal-count">Posts</Label>
                  <Input
                    id="post-goal-count"
                    type="number"
                    min={0}
                    placeholder="e.g. 3"
                    value={count}
                    onChange={(e) =>
                      form.setValue('estimated_post_count', e.target.value, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="post-goal-cadence">Counted</Label>
                  <TextSelect
                    id="post-goal-cadence"
                    variant="default"
                    size="default"
                    value={cadence}
                    onValueChange={(value) =>
                      form.setValue('goal_cadence', value as GoalCadence, {
                        shouldDirty: true,
                      })
                    }
                    elements={CADENCE_OPTIONS}
                  />
                </div>
              </div>

              {/* The number the campaign is actually planned against, with the
                  arithmetic that produced it — it decides how much the
                  assistant generates, so it can't be left implicit. */}
              <p
                className={cn(
                  'text-sm',
                  total.kind === 'ok' && total.dated
                    ? 'text-foreground'
                    : 'text-warning',
                )}
              >
                {describePostGoalTotal(
                  Number.isFinite(perPeriod) ? perPeriod : null,
                  cadence,
                  total,
                )}
              </p>

              {/* How much of that the campaign's series already account for —
                  the second half of the same sentence, so it sits under the
                  total rather than in a card of its own.

                  **This is the only place the share is stated.** The rhythms
                  behind it are set per series, on `CampaignSeriesCard` further
                  down the same page since CON-305, and that card prints the
                  per-series claims and never this total — one sentence, one
                  home, however close together the two ended up. Draws nothing
                  when the `series` flag is off or the campaign runs none. */}
              <SeriesShareLine
                campaignId={campaignId}
                postsPerPeriod={Number.isFinite(perPeriod) ? perPeriod : null}
                cadence={cadence}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </div>
        </div>
      </div>
    </SettingsCard>
  )
}
