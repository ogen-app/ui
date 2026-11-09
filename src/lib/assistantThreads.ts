import type { TFunction } from 'i18next'
import { relativeTime } from '@/lib/relativeTime'
import type { ThreadSummary } from '@/services/api/assistant'
import { threadIdFor } from '@/stores/assistantStore'
import {
  subjectCampaignId,
  type AssistantThread,
  type ThreadSubject,
} from '@/types/assistant'

/**
 * One row of the thread list (CON-459): a thread the server lists, a thread
 * this tab has open, or both. The server's list is what survives a reload;
 * the tab's copy is what is live — a running turn, an unread reply, turns not
 * yet refetched — so when both exist the tab's wins.
 */
export type ThreadRow = {
  id: string
  subject: ThreadSubject
  title: string
  campaignTitle: string
  live?: AssistantThread
  summary?: ThreadSummary
  /** Wall-clock ms of the newest activity either side knows of; 0 for none. */
  lastActivity: number
}

/**
 * The tab's threads and the server's, one row per thread. The current subject
 * comes first, then the rest of its campaign, then everything else — newest
 * activity first within each — so the list opens on the work in front of the
 * user.
 */
export function mergeThreadRows(
  threads: Record<string, AssistantThread>,
  summaries: ThreadSummary[],
  currentId: string | null,
): ThreadRow[] {
  const rows = new Map<string, ThreadRow>()
  for (const summary of summaries) {
    const id = threadIdFor(summary.subject)
    if (rows.has(id)) continue
    rows.set(id, {
      id,
      subject: summary.subject,
      title: summary.title,
      campaignTitle: summary.campaignTitle,
      summary,
      lastActivity: Date.parse(summary.lastMessageAt) || 0,
    })
  }
  for (const live of Object.values(threads)) {
    const known = rows.get(live.id)
    rows.set(live.id, {
      id: live.id,
      subject: live.subject,
      // The page bound on arrival names it from the entity it just loaded,
      // which is fresher than the list — unless it has nothing to say yet.
      title: live.title || known?.title || '',
      campaignTitle: live.campaignTitle || known?.campaignTitle || '',
      live,
      summary: known?.summary,
      lastActivity: Math.max(known?.lastActivity ?? 0, live.lastActiveAt ?? 0),
    })
  }

  const list = [...rows.values()].sort(
    (a, b) => b.lastActivity - a.lastActivity,
  )
  const current = currentId ? rows.get(currentId) : undefined
  if (!current) return list
  const campaignId = subjectCampaignId(current.subject)
  const sameCampaign = (row: ThreadRow) =>
    campaignId !== undefined && subjectCampaignId(row.subject) === campaignId
  return [
    current,
    ...list.filter((row) => row.id !== current.id && sameCampaign(row)),
    ...list.filter((row) => row.id !== current.id && !sameCampaign(row)),
  ]
}

/**
 * Whether the row should state the server's last message rather than the
 * tab's own account of the thread: true until the tab has turns of its own or
 * a run in hand.
 */
export function showsSummary(row: ThreadRow): row is ThreadRow & {
  summary: ThreadSummary
} {
  if (!row.summary) return false
  const live = row.live
  return !live || (live.turns.length === 0 && live.status === 'idle')
}

/** "5 min ago" for the newest message, or "just now" under a minute. */
export function lastActivityText(
  t: TFunction,
  iso: string,
  now: Date,
  locale: string,
): string | null {
  const at = Date.parse(iso)
  if (!at) return null
  if (Math.abs(now.getTime() - at) < 60_000) return t('assistant.list.justNow')
  return relativeTime(iso, now, locale)
}
