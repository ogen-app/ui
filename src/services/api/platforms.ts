import type { Platform } from '@/types/campaigns'
import type { PostTypeRuleView } from '@/types/validation'
import { apiJson } from './http'

const BASE = '/api/platforms'

export function listPlatforms(): Promise<Platform[]> {
  return apiJson<Platform[]>(BASE, 'Unable to fetch platforms')
}

/**
 * Per-post-type structural rules for one platform (content required,
 * attachment kinds, min/max counts) with the platform's own attachment cap
 * already folded into `max_attachments`. The server is the source of truth
 * for the publish gate; this is what lets the editor check the same rules
 * before the user hits it.
 */
export function getPostTypeRules(
  platformId: string,
): Promise<PostTypeRuleView[]> {
  return apiJson<PostTypeRuleView[]>(
    `${BASE}/${platformId}/post-type-rules`,
    'Unable to fetch post type rules',
  )
}
