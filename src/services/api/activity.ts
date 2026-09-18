import { apiJson } from './http'
import { isRecord } from './json'
import type {
  ActivityAuthorCount,
  ActivityChannelCount,
  ActivityFailedPost,
  ActivityReport,
  ActivityReportSummary,
} from '@/types/activity'

/**
 * The Activity daily report (CON-285).
 *
 * Two reads, both workspace-scoped through `apiJson`'s `X-Workspace-Id`, and
 * both requiring an IANA `tz`: the report is cut into *local* calendar days and
 * the server has no other way to know where the reader's midnight is. Omit it
 * and the answer is a 400, not a UTC day — which is the good failure, because a
 * report silently cut by the wrong midnight is one nobody would notice was
 * wrong.
 *
 * Everything is parsed defensively, for the same reason the notification list
 * is: this is a nested shape, and one absent branch of it must cost a section
 * rather than the whole screen. Missing counts read as zero and missing lists
 * as empty, which is exactly what a quiet day looks like — the honest reading
 * when the server sends less than the contract promises.
 */

const REPORT_PATH = '/api/activity/report'
const REPORTS_PATH = '/api/activity/reports'

/**
 * How many days of reports the feed asks for.
 *
 * The server's default, and well under its maximum of 100. It is a horizon
 * rather than a page — nothing here pages backwards yet — so the screen says
 * where the list stops instead of implying that is all there was. Days with
 * nothing on them are not counted against it: 30 means the last 30 days that
 * had *something*, which on a quiet workspace can reach back months.
 */
export const ACTIVITY_REPORT_DAYS = 30

export type ActivityReportScope = {
  /** IANA zone. Required by the API; there is no server-side default. */
  tz: string
  /** Narrow to one campaign. Absent is the whole workspace. */
  campaignId?: string
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function channelCounts(value: unknown): ActivityChannelCount[] {
  return list(value)
    .filter(isRecord)
    .map((row) => ({
      platform_id: text(row.platform_id),
      count: number(row.count),
    }))
}

function authorCounts(value: unknown): ActivityAuthorCount[] {
  return list(value)
    .filter(isRecord)
    .map((row) => ({ user_id: text(row.user_id), count: number(row.count) }))
}

function failedPosts(value: unknown): ActivityFailedPost[] {
  return (
    list(value)
      .filter(isRecord)
      // A row with no id cannot be linked to and cannot be told apart from the
      // next one, so it is dropped rather than rendered as an anonymous
      // failure. The totals beside it still count it.
      .filter((row) => text(row.post_id) !== '')
      .map((row) => ({
        post_id: text(row.post_id),
        platform_id: text(row.platform_id),
        status: text(row.status),
        failure_reason: text(row.failure_reason),
      }))
  )
}

/** Reads the wire shape into `ActivityReport`, defaulting every absent branch. */
export function parseActivityReport(
  body: unknown,
  date: string,
  tz: string,
): ActivityReport {
  const row = isRecord(body) ? body : {}
  const published = isRecord(row.published) ? row.published : {}
  const failed = isRecord(row.failed) ? row.failed : {}
  const created = isRecord(row.created) ? row.created : {}
  const campaigns = isRecord(row.campaigns_created) ? row.campaigns_created : {}

  return {
    // The requested day and zone are the fallback for the echoed ones: the
    // screen titles itself from `date`, and a blank title is a worse answer
    // than the day the reader asked for.
    date: text(row.date) || date,
    tz: text(row.tz) || tz,
    published: {
      total: number(published.total),
      by_channel: channelCounts(published.by_channel),
    },
    failed: {
      total: number(failed.total),
      by_channel: channelCounts(failed.by_channel),
      posts: failedPosts(failed.posts),
    },
    created: {
      posts_total: number(created.posts_total),
      scheduled_total: number(created.scheduled_total),
      by_author: authorCounts(created.by_author),
    },
    campaigns_created: {
      total: number(campaigns.total),
      campaign_ids: list(campaigns.campaign_ids).filter(
        (id): id is string => typeof id === 'string',
      ),
    },
  }
}

/** Reads one day-list row, or null if it names no day. */
function parseReportSummary(value: unknown): ActivityReportSummary | null {
  if (!isRecord(value)) return null
  const date = text(value.date)
  if (!date) return null
  return {
    date,
    published_total: number(value.published_total),
    failed_total: number(value.failed_total),
    created_total: number(value.created_total),
    campaigns_created_total: number(value.campaigns_created_total),
  }
}

function scopeParams(scope: ActivityReportScope): URLSearchParams {
  const params = new URLSearchParams({ tz: scope.tz })
  if (scope.campaignId) params.set('campaign_id', scope.campaignId)
  return params
}

/**
 * One local day, in full.
 *
 * A day with nothing on it answers 200 with zeroes rather than 404, so a link
 * to a quiet day renders the report saying so. A future day is the same: it
 * simply has not happened.
 */
export async function fetchActivityReport(
  date: string,
  scope: ActivityReportScope,
): Promise<ActivityReport> {
  const body = await apiJson<unknown>(
    `${REPORT_PATH}/${date}?${scopeParams(scope)}`,
    'Unable to load the daily report',
  )
  return parseActivityReport(body, date, scope.tz)
}

/** The days that had something on them, newest first. */
export async function listActivityReports(
  scope: ActivityReportScope,
  limit: number = ACTIVITY_REPORT_DAYS,
): Promise<ActivityReportSummary[]> {
  const params = scopeParams(scope)
  params.set('limit', String(limit))
  const body = await apiJson<unknown>(
    `${REPORTS_PATH}?${params}`,
    'Unable to load the daily reports',
  )
  // `{reports: […]}`, not a bare array — the opposite of the notification list
  // next door, and the kind of difference that type-checks either way.
  const rows = isRecord(body) ? body.reports : null
  return list(rows)
    .map(parseReportSummary)
    .filter((row): row is ActivityReportSummary => row !== null)
}
