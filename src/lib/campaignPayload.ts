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
    use_assets: campaign.use_assets,
    asset_ids: campaign.asset_ids,
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
