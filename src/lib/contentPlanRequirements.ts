import type { Campaign } from '@/types/campaigns'

// Mirrors the server-side generation gate (Go:
// src/genkit/flows/content_plan/validate.go). The server is the source of
// truth — keep in sync when its required-field list changes.

const REQUIRED_TEXT_FIELDS: [keyof Campaign, string][] = [
  ['name', 'name'],
  ['description', 'description'],
  ['target_persona', 'target persona'],
  ['key_messages', 'key messages'],
  ['tone_guidelines', 'tone guidelines'],
  ['campaign_type_id', 'campaign type'],
]

/**
 * Returns the human-readable list of requirements a campaign is missing
 * before an AI draft plan can be generated; empty when generation may run.
 */
export function missingPlanRequirements(campaign: Campaign): string[] {
  const missing: string[] = []
  for (const [field, label] of REQUIRED_TEXT_FIELDS) {
    const value = campaign[field]
    if (typeof value !== 'string' || value.trim() === '') missing.push(label)
  }
  if (!campaign.start_date) missing.push('start date')
  if (!campaign.end_date) missing.push('end date')
  if (campaign.start_date && campaign.end_date) {
    const start = new Date(campaign.start_date).getTime()
    const end = new Date(campaign.end_date).getTime()
    if (end - start < 24 * 60 * 60 * 1000) missing.push('a date range of at least 1 day')
  }
  if (campaign.target_platforms.length === 0) missing.push('at least one platform')
  return missing
}
