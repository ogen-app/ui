import type { CalendarFinding } from '@/types/assistant'
import { apiJson, apiVoid } from './http'
import { isRecord } from './json'

/**
 * A campaign's calendar problems (CON-462): the same findings the assistant's
 * calendar check reads, each with the fixes it would offer, minus the ones
 * dismissed — counted. Read off the campaign's overview, which carries them
 * as `problems`; nothing else on that read is used here.
 */
export type CampaignProblems = {
  problems: CalendarFinding[]
  dismissed: number
}

/**
 * Null when the overview carries no `problems` at all — an API from before
 * CON-462 — so the Overview keeps its own rules for what the server would
 * have checked. A `null` list (Go's nil slice) is an empty one.
 */
export async function getCampaignProblems(
  campaignId: string,
): Promise<CampaignProblems | null> {
  const raw = await apiJson<unknown>(
    `/api/campaigns/${campaignId}/overview`,
    'Unable to load the campaign’s problems',
  )
  const ov = isRecord(raw) ? raw : {}
  if (!('problems' in ov)) return null
  const problems = Array.isArray(ov.problems) ? ov.problems : []
  return {
    dismissed:
      typeof ov.problemsDismissed === 'number' ? ov.problemsDismissed : 0,
    // A problem without a key can't be ignored or listed apart from another.
    problems: problems
      .filter(isRecord)
      .filter((p) => text(p.key))
      .map((p) => ({
        key: text(p.key),
        code: text(p.code),
        severity: p.severity === 'warning' ? 'warning' : 'info',
        message: text(p.message),
        postIds: list(p.postIds),
        // No offers here: the Overview doesn't run the assistant, so a fix is
        // what to ask it for, or a post to open.
        fixes: (Array.isArray(p.fixes) ? p.fixes : [])
          .filter(isRecord)
          .map((f) => ({
            kind: text(f.kind),
            title: text(f.title),
            postId: typeof f.postId === 'string' ? f.postId : undefined,
            postIds: list(f.postIds),
          }))
          .filter((f) => f.title),
      })),
  }
}

/**
 * Dismisses a finding by its key, in the campaign's scope — the dismissals the
 * Overview and the campaign's assistant thread share. Twice is once.
 */
export function dismissCampaignFinding(
  campaignId: string,
  key: string,
): Promise<void> {
  return apiVoid(
    `/api/campaigns/${campaignId}/findings/${encodeURIComponent(key)}/dismiss`,
    'Unable to ignore that problem',
    { method: 'POST' },
  )
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : []
}
