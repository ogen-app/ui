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
 * With two exceptions, and they are exceptions because the server made them
 * ones: `use_assets` and `asset_ids` are presence-aware since CON-233, so
 * omitting them leaves the campaign's documents alone. They are omitted on
 * purpose. Membership has its own endpoints now, and a brief autosave that
 * restated the set — from whatever snapshot the form was built on — would put
 * an old copy of it back over an attach that had just landed. Nothing here may
 * name them again; see `lib/campaignMembership`.
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
