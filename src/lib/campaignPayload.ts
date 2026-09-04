import {
  DEFAULT_PUBLISHING_TIME,
  DEFAULT_SPREAD_MINUTES,
  defaultPublishingDays,
} from '@/lib/campaignScheduling'
import { normalizeGoalCadence } from '@/lib/postGoal'
import type { Campaign, UpdateCampaignPayload } from '@/types/campaigns'

/**
 * A campaign update is a whole-resource PUT, and the server fills in a default
 * for every field the payload leaves out — so this has to name all of them.
 * Dropping `publishing_days` here does not preserve the campaign's publishing
 * days, it resets them to all seven.
 *
 * The two exceptions are `use_assets` and `asset_ids`, which are absent on
 * purpose. The server reads them presence-aware since CON-233 — an omitted key
 * leaves the stored value alone, right down to dropping the column from the
 * UPDATE — because the content-bank set has its own membership endpoints now.
 * Restating it here would mean every brief save carried a set as its form had
 * read it, and would undo an attach that landed while the user was typing.
 *
 * They can still be passed as `overrides`, and one caller does: clearing the
 * legacy whole-bank flag on a campaign with nothing to pin
 * (`lib/campaignMembership`). A *present* field still full-replaces, so passing
 * one is saying so.
 */
export function campaignToPayload(
  campaign: Campaign,
  overrides: Partial<UpdateCampaignPayload> = {},
): UpdateCampaignPayload {
  return {
    name: campaign.name,
    campaign_type_id: campaign.campaign_type_id,
    description: campaign.description,
    target_persona: campaign.target_persona,
    key_messages: campaign.key_messages,
    tone_guidelines: campaign.tone_guidelines,
    target_platforms: campaign.target_platforms,
    status: campaign.status,
    start_date: campaign.start_date,
    end_date: campaign.end_date,
    estimated_post_count: campaign.estimated_post_count,
    goal_cadence: normalizeGoalCadence(campaign.goal_cadence),
    publishing_time: campaign.publishing_time || DEFAULT_PUBLISHING_TIME,
    timezone: campaign.timezone ?? '',
    publishing_days: campaign.publishing_days?.length
      ? campaign.publishing_days
      : defaultPublishingDays(),
    spread_minutes: campaign.spread_minutes ?? DEFAULT_SPREAD_MINUTES,
    budget: campaign.budget,
    currency: campaign.currency,
    language: campaign.language,
    tag_ids: campaign.tag_ids,
    ...overrides,
  }
}
