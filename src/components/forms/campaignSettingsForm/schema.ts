import { z } from 'zod'

import {
  DEFAULT_PUBLISHING_TIME,
  DEFAULT_SPREAD_MINUTES,
  MAX_SPREAD_MINUTES,
  defaultPublishingDays,
  displayTimeZone,
} from '@/lib/campaignScheduling'
import { normalizeGoalCadence } from '@/lib/postGoal'
import type { Campaign } from '@/types/campaigns'

const numericString = z
  .string()
  .refine((v) => v === '' || Number.isFinite(Number(v)), 'Must be a number')

/**
 * The campaign settings page's form values.
 *
 * It lives here rather than in `CampaignSettingsForm` because the Goals and
 * Scheduling cards read the same form through `useFormContext` — they edit
 * campaign columns like every other field on the page, and are applied together
 * by the header's Save.
 */
export const settingsSchema = z.object({
  name: z.string(),
  campaign_type_id: z.string().min(1, 'Campaign type is required'),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  /** Posts per `goal_cadence` period — see `lib/postGoal`, not a total. */
  estimated_post_count: numericString,
  goal_cadence: z.enum(['week', 'month']),
  publishing_time: z.string(),
  timezone: z.string(),
  publishing_days: z.array(z.string()),
  spread_minutes: z.number().int().min(0).max(MAX_SPREAD_MINUTES),
  budget: numericString,
  currency: z.string(),
  language: z.string(),
  tag_ids: z.array(z.string()),
  target_platforms: z.array(
    z.object({
      id: z.string(),
      post_types: z.array(z.string()),
    }),
  ),
})

export type SettingsFormValues = z.infer<typeof settingsSchema>

/**
 * The campaign as the form holds it. The scheduling fields fall back to the
 * server's own defaults rather than to blanks: they are `NOT NULL` columns, so
 * an empty one means an old row the migration hasn't been read back through
 * yet, not "unset".
 */
export function settingsDefaultValues(campaign: Campaign): SettingsFormValues {
  return {
    name: campaign.name,
    campaign_type_id: campaign.campaign_type_id,
    start_date: campaign.start_date,
    end_date: campaign.end_date,
    estimated_post_count:
      campaign.estimated_post_count == null ? '' : String(campaign.estimated_post_count),
    goal_cadence: normalizeGoalCadence(campaign.goal_cadence),
    publishing_time: campaign.publishing_time || DEFAULT_PUBLISHING_TIME,
    // `""` is how the server spells UTC; the picker needs a zone to select.
    timezone: displayTimeZone(campaign.timezone),
    publishing_days: campaign.publishing_days?.length
      ? campaign.publishing_days
      : defaultPublishingDays(),
    spread_minutes: campaign.spread_minutes ?? DEFAULT_SPREAD_MINUTES,
    budget: campaign.budget == null ? '' : String(campaign.budget),
    currency: campaign.currency,
    language: campaign.language,
    tag_ids: campaign.tag_ids ?? [],
    target_platforms: campaign.target_platforms ?? [],
  }
}
